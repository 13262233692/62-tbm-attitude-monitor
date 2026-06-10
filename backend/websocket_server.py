import asyncio
import json
import logging
import time
from typing import Set

import websockets

from models import TBMTelemetry

logger = logging.getLogger(__name__)


class TelemetryWebSocketServer:
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self._clients: Set[websockets.WebSocketServerProtocol] = set()
        self._server = None
        self._latest_telemetry: TBMTelemetry = None

    async def start(self):
        self._server = await websockets.serve(
            self._handler,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=10,
        )
        logger.info(f"WebSocket server started on ws://{self.host}:{self.port}")

    async def _handler(self, websocket):
        self._clients.add(websocket)
        remote = websocket.remote_address
        logger.info(f"Client connected: {remote} (total: {len(self._clients)})")

        if self._latest_telemetry:
            try:
                await websocket.send(self._latest_telemetry.model_dump_json())
            except Exception:
                pass

        try:
            async for message in websocket:
                pass
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self._clients.discard(websocket)
            logger.info(f"Client disconnected: {remote} (total: {len(self._clients)})")

    async def broadcast(self, telemetry: TBMTelemetry):
        self._latest_telemetry = telemetry
        if not self._clients:
            return

        payload = telemetry.model_dump_json()
        snapshot = list(self._clients)
        disconnected = []
        for client in snapshot:
            try:
                await client.send(payload)
            except websockets.exceptions.ConnectionClosed:
                disconnected.append(client)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                disconnected.append(client)

        for c in disconnected:
            self._clients.discard(c)

    async def stop(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()
        logger.info("WebSocket server stopped")
