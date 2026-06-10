import asyncio
import math
import time
import struct
import random
import numpy as np
from typing import Callable, Awaitable

from models import PLCRegisterMap, TBMTelemetry

logging = __import__("logging")
logger = logging.getLogger(__name__)


class TBMSimulator:
    def __init__(self, register_map: PLCRegisterMap = None):
        self.register_map = register_map or PLCRegisterMap()
        self._running = False
        self._t = 0.0

        self._base_x = 12456.0
        self._base_y = 3.5
        self._base_z = -8.5

        self._excavation_phase = True
        self._phase_timer = 0.0
        self._excavation_duration = 30.0
        self._ring_build_duration = 10.0

    def _generate_s7_block(self) -> bytes:
        rm = self.register_map
        total_size = rm.status_word_offset + 4
        buf = bytearray(total_size)

        self._t += 0.1
        self._phase_timer += 0.1

        if self._excavation_phase and self._phase_timer > self._excavation_duration:
            self._excavation_phase = False
            self._phase_timer = 0.0
        elif not self._excavation_phase and self._phase_timer > self._ring_build_duration:
            self._excavation_phase = True
            self._phase_timer = 0.0

        if self._excavation_phase:
            advance = 0.045 * self._t
            pitch = 0.35 + 0.08 * math.sin(self._t * 0.15)
            roll = -0.12 + 0.05 * math.sin(self._t * 0.22 + 1.0)
            yaw = 89.97 + 0.03 * math.sin(self._t * 0.08)
            cutterhead_rpm = 3.5 + 0.3 * math.sin(self._t * 0.5)
            thrust_pressure = 12.8 + 1.5 * math.sin(self._t * 0.3 + 0.5)
            advance_speed = 45.0 + 8.0 * math.sin(self._t * 0.4)
            torque = 3200.0 + 400.0 * math.sin(self._t * 0.35 + 1.2)
            screw_speed = 8.5 + 1.0 * math.sin(self._t * 0.6)
            grout_pressure = 0.0
        else:
            advance = 0.0
            pitch = 0.35 + 0.02 * math.sin(self._t * 0.05)
            roll = -0.12 + 0.01 * math.sin(self._t * 0.05 + 1.0)
            yaw = 89.97 + 0.005 * math.sin(self._t * 0.03)
            cutterhead_rpm = 0.0
            thrust_pressure = 2.0 + 0.3 * math.sin(self._t * 0.1)
            advance_speed = 0.0
            torque = 0.0
            screw_speed = 0.0
            grout_pressure = 0.28 + 0.04 * math.sin(self._t * 0.2)

        noise = lambda s=0.01: random.gauss(0, s)

        struct.pack_into(">f", buf, rm.position_x_offset, self._base_x + advance + noise(0.005))
        struct.pack_into(">f", buf, rm.position_y_offset, self._base_y + noise(0.002))
        struct.pack_into(">f", buf, rm.position_z_offset, self._base_z + noise(0.002))
        struct.pack_into(">f", buf, rm.pitch_offset, pitch + noise(0.005))
        struct.pack_into(">f", buf, rm.roll_offset, roll + noise(0.005))
        struct.pack_into(">f", buf, rm.yaw_offset, yaw + noise(0.003))
        struct.pack_into(">f", buf, rm.cutterhead_rpm_offset, max(0, cutterhead_rpm + noise(0.05)))
        struct.pack_into(">f", buf, rm.thrust_pressure_offset, max(0, thrust_pressure + noise(0.05)))
        struct.pack_into(">f", buf, rm.advance_speed_offset, max(0, advance_speed + noise(0.1)))
        struct.pack_into(">f", buf, rm.torque_offset, max(0, torque + noise(5.0)))
        struct.pack_into(">f", buf, rm.shield_tail_seal_pressure_offset, max(0, 0.35 + noise(0.01)))
        struct.pack_into(">f", buf, rm.grout_pressure_offset, max(0, grout_pressure + noise(0.005)))
        struct.pack_into(">f", buf, rm.screw_conveyor_speed_offset, max(0, screw_speed + noise(0.05)))

        status = 0x0001 if self._excavation_phase else 0x0002
        struct.pack_into(">I", buf, rm.status_word_offset, status)

        return bytes(buf)

    def generate_telemetry(self) -> TBMTelemetry:
        from data_parser import DataParser

        raw = self._generate_s7_block()
        parser = DataParser(self.register_map)
        return parser.parse_s7_block(raw)

    async def poll_loop(self, callback: Callable[[bytes], Awaitable[None]]):
        self._running = True
        while self._running:
            raw = self._generate_s7_block()
            await callback(raw)
            await asyncio.sleep(0.1)

    def stop(self):
        self._running = False
        logger.info("TBM Simulator stopped")
