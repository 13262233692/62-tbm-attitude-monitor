import struct
import time
import math
import numpy as np
from models import TBMTelemetry, PLCRegisterMap


class PeckSettlement:
    TUNNEL_RADIUS = 3.5

    @staticmethod
    def trough_width_parameter(depth: float, soil_type: str = "clay") -> float:
        k_map = {"clay": 0.5, "silty_clay": 0.45, "sand": 0.35, "gravel": 0.25}
        k = k_map.get(soil_type, 0.45)
        return k * depth

    @staticmethod
    def max_settlement(volume_loss_pct: float, radius: float, depth: float, soil_type: str = "clay") -> float:
        i = PeckSettlement.trough_width_parameter(depth, soil_type)
        if i <= 0:
            return 0.0
        vl_per_meter = (volume_loss_pct / 100.0) * math.pi * radius * radius
        s_max = vl_per_meter / (math.sqrt(2 * math.pi) * i)
        return s_max * 1000.0

    @staticmethod
    def settlement_at_y(y_distance: float, s_max_mm: float, i: float) -> float:
        if i <= 0:
            return 0.0
        return s_max_mm * math.exp(-(y_distance ** 2) / (2 * i ** 2))

    @staticmethod
    def settlement_profile(y_positions: list, volume_loss_pct: float, radius: float, depth: float, soil_type: str = "clay") -> list:
        i = PeckSettlement.trough_width_parameter(depth, soil_type)
        s_max = PeckSettlement.max_settlement(volume_loss_pct, radius, depth, soil_type)
        return [PeckSettlement.settlement_at_y(y, s_max, i) for y in y_positions]


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
            volume_loss=self.parse_real(raw_data, rm.volume_loss_offset),
            tunnel_depth=self.parse_real(raw_data, rm.tunnel_depth_offset),
            is_excavating=is_excavating,
            is_ring_building=is_ring_building,
        )

    def parse_opcua_nodes(self, node_values: dict) -> TBMTelemetry:
        def _get(key: str, default: float = 0.0) -> float:
            val = node_values.get(key, default)
            return float(val) if val is not None else default

        status = int(_get("StatusWord", 0))
        volume_loss = _get("VolumeLoss")
        tunnel_depth = _get("TunnelDepth", 12.0)
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
            volume_loss=volume_loss,
            tunnel_depth=tunnel_depth,
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

    @staticmethod
    def euler_to_quaternion(pitch_deg: float, roll_deg: float, yaw_deg: float) -> dict:
        p = np.radians(pitch_deg) / 2.0
        r = np.radians(roll_deg) / 2.0
        y = np.radians(yaw_deg) / 2.0

        cp = np.cos(p)
        sp = np.sin(p)
        cr = np.cos(r)
        sr = np.sin(r)
        cy = np.cos(y)
        sy = np.sin(y)

        w = cr * cp * cy + sr * sp * sy
        x = cr * sp * cy + sr * cp * sy
        y_out = cr * cp * sy - sr * sp * cy
        z = sr * cp * cy - cr * sp * sy

        norm = np.sqrt(w * w + x * x + y_out * y_out + z * z)
        if norm > 0:
            w /= norm
            x /= norm
            y_out /= norm
            z /= norm

        return {"qx": float(x), "qy": float(y_out), "qz": float(z), "qw": float(w)}

    @staticmethod
    def rotation_matrix_to_quaternion(R: np.ndarray) -> dict:
        trace = R[0, 0] + R[1, 1] + R[2, 2]

        if trace > 0:
            s = 0.5 / np.sqrt(trace + 1.0)
            w = 0.25 / s
            x = (R[2, 1] - R[1, 2]) * s
            y = (R[0, 2] - R[2, 0]) * s
            z = (R[1, 0] - R[0, 1]) * s
        elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
            s = 2.0 * np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2])
            w = (R[2, 1] - R[1, 2]) / s
            x = 0.25 * s
            y = (R[0, 1] + R[1, 0]) / s
            z = (R[0, 2] + R[2, 0]) / s
        elif R[1, 1] > R[2, 2]:
            s = 2.0 * np.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2])
            w = (R[0, 2] - R[2, 0]) / s
            x = (R[0, 1] + R[1, 0]) / s
            y = 0.25 * s
            z = (R[1, 2] + R[2, 1]) / s
        else:
            s = 2.0 * np.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1])
            w = (R[1, 0] - R[0, 1]) / s
            x = (R[0, 2] + R[2, 0]) / s
            y = (R[1, 2] + R[2, 1]) / s
            z = 0.25 * s

        norm = np.sqrt(w * w + x * x + y * y + z * z)
        return {
            "qx": float(x / norm),
            "qy": float(y / norm),
            "qz": float(z / norm),
            "qw": float(w / norm),
        }
