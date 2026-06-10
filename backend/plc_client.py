import asyncio
import logging
import struct
from typing import Optional, Callable, Awaitable

from models import PLCRegisterMap

logger = logging.getLogger(__name__)


class S7PLCClient:
    def __init__(
        self,
        ip: str,
        rack: int = 0,
        slot: int = 1,
        register_map: PLCRegisterMap = None,
        poll_interval: float = 0.1,
    ):
        self.ip = ip
        self.rack = rack
        self.slot = slot
        self.register_map = register_map or PLCRegisterMap()
        self.poll_interval = poll_interval
        self._client = None
        self._connected = False
        self._running = False

    async def connect(self) -> bool:
        try:
            import snap7.client
            import snap7.util

            self._client = snap7.client.Client()
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None, lambda: self._client.connect(self.ip, self.rack, self.slot)
            )
            self._connected = self._client.get_connected()
            if self._connected:
                logger.info(f"S7 PLC connected at {self.ip} (rack={self.rack}, slot={self.slot})")
            else:
                logger.error(f"S7 PLC connection failed at {self.ip}")
            return self._connected
        except Exception as e:
            logger.error(f"S7 connection error: {e}")
            self._connected = False
            return False

    async def read_db_block(self, db_number: int, start: int, size: int) -> Optional[bytes]:
        if not self._connected or self._client is None:
            return None
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(
                None, lambda: self._client.db_read(db_number, start, size)
            )
            return bytes(data)
        except Exception as e:
            logger.error(f"S7 read error (DB{db_number}.{start}+{size}): {e}")
            self._connected = False
            return None

    async def read_all_registers(self) -> Optional[bytes]:
        rm = self.register_map
        total_size = rm.status_word_offset + 4
        return await self.read_db_block(rm.db_number, 0, total_size)

    async def poll_loop(self, callback: Callable[[bytes], Awaitable[None]]):
        self._running = True
        while self._running:
            if not self._connected:
                logger.warning("S7 disconnected, attempting reconnect...")
                connected = await self.connect()
                if not connected:
                    await asyncio.sleep(2.0)
                    continue

            raw = await self.read_all_registers()
            if raw is not None:
                await callback(raw)
            else:
                await asyncio.sleep(1.0)

            await asyncio.sleep(self.poll_interval)

    def stop(self):
        self._running = False
        if self._client:
            try:
                self._client.disconnect()
            except Exception:
                pass
        self._connected = False
        logger.info("S7 PLC client stopped")


class OPCUAClient:
    def __init__(
        self,
        endpoint: str,
        node_ids: dict = None,
        poll_interval: float = 0.1,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.endpoint = endpoint
        self.node_ids = node_ids or {
            "PositionX": "ns=2;s=TBM.Position.X",
            "PositionY": "ns=2;s=TBM.Position.Y",
            "PositionZ": "ns=2;s=TBM.Position.Z",
            "Pitch": "ns=2;s=TBM.Attitude.Pitch",
            "Roll": "ns=2;s=TBM.Attitude.Roll",
            "Yaw": "ns=2;s=TBM.Attitude.Yaw",
            "CutterheadRPM": "ns=2;s=TBM.Cutterhead.RPM",
            "ThrustPressure": "ns=2;s=TBM.Thrust.Pressure",
            "AdvanceSpeed": "ns=2;s=TBM.Advance.Speed",
            "Torque": "ns=2;s=TBM.Cutterhead.Torque",
            "ShieldTailSealPressure": "ns=2;s=TBM.ShieldTailSeal.Pressure",
            "GroutPressure": "ns=2;s=TBM.Grout.Pressure",
            "ScrewConveyorSpeed": "ns=2;s=TBM.ScrewConveyor.Speed",
            "StatusWord": "ns=2;s=TBM.StatusWord",
        }
        self.poll_interval = poll_interval
        self.username = username
        self.password = password
        self._client = None
        self._connected = False
        self._running = False
        self._node_handles = {}

    async def connect(self) -> bool:
        try:
            from opcua import Client as OPCClient

            self._client = OPCClient(self.endpoint)
            if self.username and self.password:
                self._client.set_user(self.username)
                self._client.set_password(self.password)

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._client.connect)

            for name, node_id in self.node_ids.items():
                self._node_handles[name] = self._client.get_node(node_id)

            self._connected = True
            logger.info(f"OPC-UA connected to {self.endpoint}")
            return True
        except Exception as e:
            logger.error(f"OPC-UA connection error: {e}")
            self._connected = False
            return False

    async def read_all_nodes(self) -> Optional[dict]:
        if not self._connected or self._client is None:
            return None
        try:
            values = {}
            loop = asyncio.get_event_loop()
            for name, node in self._node_handles.items():
                val = await loop.run_in_executor(None, node.get_value)
                values[name] = val
            return values
        except Exception as e:
            logger.error(f"OPC-UA read error: {e}")
            self._connected = False
            return None

    async def poll_loop(self, callback: Callable[[dict], Awaitable[None]]):
        self._running = True
        while self._running:
            if not self._connected:
                logger.warning("OPC-UA disconnected, attempting reconnect...")
                connected = await self.connect()
                if not connected:
                    await asyncio.sleep(2.0)
                    continue

            values = await self.read_all_nodes()
            if values is not None:
                await callback(values)
            else:
                await asyncio.sleep(1.0)

            await asyncio.sleep(self.poll_interval)

    def stop(self):
        self._running = False
        if self._client:
            try:
                self._client.disconnect()
            except Exception:
                pass
        self._connected = False
        logger.info("OPC-UA client stopped")
