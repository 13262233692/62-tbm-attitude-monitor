import asyncio
import argparse
import logging
import signal
import sys

from models import PLCRegisterMap
from data_parser import DataParser, PeckSettlement
from plc_client import S7PLCClient, OPCUAClient
from websocket_server import TelemetryWebSocketServer
from simulator import TBMSimulator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("tbm_gateway")


async def run_with_simulator(ws_server: TelemetryWebSocketServer, register_map: PLCRegisterMap):
    simulator = TBMSimulator(register_map)
    parser = DataParser(register_map)

    logger.info("Starting in SIMULATOR mode (no real PLC connection)")

    async def on_raw_data(raw: bytes):
        telemetry = parser.parse_s7_block(raw)
        s_max = PeckSettlement.max_settlement(
            telemetry.volume_loss, PeckSettlement.TUNNEL_RADIUS, telemetry.tunnel_depth
        )
        i = PeckSettlement.trough_width_parameter(telemetry.tunnel_depth)
        telemetry = telemetry.model_copy(update={"settlement_max": s_max, "trough_width": i})
        await ws_server.broadcast(telemetry)

    sim_task = asyncio.create_task(simulator.poll_loop(on_raw_data))
    try:
        await asyncio.gather(sim_task)
    except asyncio.CancelledError:
        pass
    finally:
        simulator.stop()


async def run_with_s7(
    ws_server: TelemetryWebSocketServer,
    plc_ip: str,
    rack: int,
    slot: int,
    register_map: PLCRegisterMap,
):
    client = S7PLCClient(ip=plc_ip, rack=rack, slot=slot, register_map=register_map)
    parser = DataParser(register_map)

    connected = await client.connect()
    if not connected:
        logger.error(f"Cannot connect to S7 PLC at {plc_ip}, falling back to simulator")
        await run_with_simulator(ws_server, register_map)
        return

    async def on_raw_data(raw: bytes):
        telemetry = parser.parse_s7_block(raw)
        await ws_server.broadcast(telemetry)

    poll_task = asyncio.create_task(client.poll_loop(on_raw_data))
    try:
        await asyncio.gather(poll_task)
    except asyncio.CancelledError:
        pass
    finally:
        client.stop()


async def run_with_opcua(
    ws_server: TelemetryWebSocketServer,
    endpoint: str,
    username: str = None,
    password: str = None,
):
    client = OPCUAClient(endpoint=endpoint, username=username, password=password)
    parser = DataParser()

    connected = await client.connect()
    if not connected:
        logger.error(f"Cannot connect to OPC-UA at {endpoint}, falling back to simulator")
        await run_with_simulator(ws_server, PLCRegisterMap())
        return

    async def on_node_values(values: dict):
        telemetry = parser.parse_opcua_nodes(values)
        await ws_server.broadcast(telemetry)

    poll_task = asyncio.create_task(client.poll_loop(on_node_values))
    try:
        await asyncio.gather(poll_task)
    except asyncio.CancelledError:
        pass
    finally:
        client.stop()


async def main():
    parser_cli = argparse.ArgumentParser(description="TBM Digital Twin - Telemetry Gateway")
    parser_cli.add_argument(
        "--mode",
        choices=["simulator", "s7", "opcua"],
        default="simulator",
        help="Data source mode (default: simulator)",
    )
    parser_cli.add_argument("--ws-host", default="0.0.0.0", help="WebSocket server host")
    parser_cli.add_argument("--ws-port", type=int, default=8765, help="WebSocket server port")
    parser_cli.add_argument("--plc-ip", default="192.168.1.100", help="S7 PLC IP address")
    parser_cli.add_argument("--s7-rack", type=int, default=0, help="S7 rack number")
    parser_cli.add_argument("--s7-slot", type=int, default=1, help="S7 slot number")
    parser_cli.add_argument("--opcua-endpoint", default="opc.tcp://192.168.1.100:4840", help="OPC-UA endpoint URL")
    parser_cli.add_argument("--opcua-username", default=None, help="OPC-UA username")
    parser_cli.add_argument("--opcua-password", default=None, help="OPC-UA password")
    parser_cli.add_argument("--poll-interval", type=float, default=0.1, help="PLC poll interval in seconds")

    args = parser_cli.parse_args()

    register_map = PLCRegisterMap()
    ws_server = TelemetryWebSocketServer(host=args.ws_host, port=args.ws_port)

    await ws_server.start()

    loop = asyncio.get_event_loop()
    stop_event = asyncio.Event()

    def _signal_handler():
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            pass

    logger.info(f"TBM Telemetry Gateway starting in {args.mode.upper()} mode")

    if args.mode == "simulator":
        run_task = asyncio.create_task(run_with_simulator(ws_server, register_map))
    elif args.mode == "s7":
        run_task = asyncio.create_task(
            run_with_s7(ws_server, args.plc_ip, args.s7_rack, args.s7_slot, register_map)
        )
    elif args.mode == "opcua":
        run_task = asyncio.create_task(
            run_with_opcua(ws_server, args.opcua_endpoint, args.opcua_username, args.opcua_password)
        )

    stop_task = asyncio.create_task(stop_event.wait())

    done, pending = await asyncio.wait(
        [run_task, stop_task], return_when=asyncio.FIRST_COMPLETED
    )

    for task in pending:
        task.cancel()

    await ws_server.stop()
    logger.info("TBM Telemetry Gateway shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
