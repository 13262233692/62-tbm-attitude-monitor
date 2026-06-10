import struct
import time
import numpy as np
from models import TBMTelemetry, PLCRegisterMap


class DataParser:
    def __init__(self, register_map: PLCRegisterMap = None):
        self.register_map = register_map or PLCRegisterMap()

    @staticmethod
    def parse_real(data: bytes, offset: int) -> float:
        if offset + 4 > len(data):
            return 0.0
        return struct.unpack(">f", data[offset : offset + 4])[0]

    @staticmethod
    def parse_dword(data: bytes, offset: int) -> int:
        if offset + 4 > len(data):
            return 0
        return struct.unpack(">I", data[offset : offset + 4])[0]

    def parse_s7_block(self, raw_data: bytes) -> TBMTelemetry:
        rm = self.register_map
        status_word = self.parse_dword(raw_data, rm.status_word_offset)

        is_excavating = bool(status_word & 0x0001)
        is_ring_building = bool(status_word & 0x0002)

        return TBMTelemetry(
            timestamp=time.time(),
            position_x=self.parse_real(raw_data, rm.position_x_offset),
            position_y=self.parse_real(raw_data, rm.position_y_offset),
            position_z=self.parse_real(raw_data, rm.position_z_offset),
            pitch=self.parse_real(raw_data, rm.pitch_offset),
            roll=self.parse_real(raw_data, rm.roll_offset),
            yaw=self.parse_real(raw_data, rm.yaw_offset),
            cutterhead_rpm=self.parse_real(raw_data, rm.cutterhead_rpm_offset),
            thrust_pressure=self.parse_real(raw_data, rm.thrust_pressure_offset),
            advance_speed=self.parse_real(raw_data, rm.advance_speed_offset),
            torque=self.parse_real(raw_data, rm.torque_offset),
            shield_tail_seal_pressure=self.parse_real(raw_data, rm.shield_tail_seal_pressure_offset),
            grout_pressure=self.parse_real(raw_data, rm.grout_pressure_offset),
            screw_conveyor_speed=self.parse_real(raw_data, rm.screw_conveyor_speed_offset),
            is_excavating=is_excavating,
            is_ring_building=is_ring_building,
        )

    def parse_opcua_nodes(self, node_values: dict) -> TBMTelemetry:
        def _get(key: str, default: float = 0.0) -> float:
            val = node_values.get(key, default)
            return float(val) if val is not None else default

        status = int(_get("StatusWord", 0))
        return TBMTelemetry(
            timestamp=time.time(),
            position_x=_get("PositionX"),
            position_y=_get("PositionY"),
            position_z=_get("PositionZ"),
            pitch=_get("Pitch"),
            roll=_get("Roll"),
            yaw=_get("Yaw"),
            cutterhead_rpm=_get("CutterheadRPM"),
            thrust_pressure=_get("ThrustPressure"),
            advance_speed=_get("AdvanceSpeed"),
            torque=_get("Torque"),
            shield_tail_seal_pressure=_get("ShieldTailSealPressure"),
            grout_pressure=_get("GroutPressure"),
            screw_conveyor_speed=_get("ScrewConveyorSpeed"),
            is_excavating=bool(status & 0x0001),
            is_ring_building=bool(status & 0x0002),
        )

    @staticmethod
    def euler_to_rotation_matrix(pitch_deg: float, roll_deg: float, yaw_deg: float) -> np.ndarray:
        p = np.radians(pitch_deg)
        r = np.radians(roll_deg)
        y = np.radians(yaw_deg)

        Rx = np.array([[1, 0, 0], [0, np.cos(p), -np.sin(p)], [0, np.sin(p), np.cos(p)]])

        Ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])

        Rz = np.array([[np.cos(r), -np.sin(r), 0], [np.sin(r), np.cos(r), 0], [0, 0, 1]])

        return Ry @ Rx @ Rz
