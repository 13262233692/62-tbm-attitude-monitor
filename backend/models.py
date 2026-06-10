from pydantic import BaseModel, Field
from typing import Optional


class TBMTelemetry(BaseModel):
    timestamp: float = Field(..., description="Unix timestamp in seconds")

    position_x: float = Field(..., description="X coordinate in meters")
    position_y: float = Field(..., description="Y coordinate in meters")
    position_z: float = Field(..., description="Z coordinate in meters")

    pitch: float = Field(..., description="Pitch angle in degrees")
    roll: float = Field(..., description="Roll angle in degrees")
    yaw: float = Field(..., description="Yaw angle in degrees")

    cutterhead_rpm: float = Field(..., description="Cutterhead rotation speed in RPM")
    thrust_pressure: float = Field(..., description="Thrust cylinder pressure in MPa")

    advance_speed: float = Field(default=0.0, description="Advance speed in mm/min")
    torque: float = Field(default=0.0, description="Cutterhead torque in kN·m")

    shield_tail_seal_pressure: float = Field(default=0.0, description="Shield tail seal pressure in MPa")
    grout_pressure: float = Field(default=0.0, description="Grout pressure in MPa")
    screw_conveyor_speed: float = Field(default=0.0, description="Screw conveyor speed in RPM")

    is_excavating: bool = Field(default=False, description="Whether TBM is in excavation mode")
    is_ring_building: bool = Field(default=False, description="Whether TBM is in ring building mode")

    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": 1700000000.0,
                "position_x": 12456.789,
                "position_y": 3.456,
                "position_z": -8.901,
                "pitch": 0.35,
                "roll": -0.12,
                "yaw": 89.97,
                "cutterhead_rpm": 3.5,
                "thrust_pressure": 12.8,
                "advance_speed": 45.0,
                "torque": 3200.0,
                "shield_tail_seal_pressure": 0.35,
                "grout_pressure": 0.28,
                "screw_conveyor_speed": 8.5,
                "is_excavating": True,
                "is_ring_building": False,
            }
        }


class PLCRegisterMap(BaseModel):
    db_number: int = Field(default=1, description="S7 DB block number")
    position_x_offset: int = Field(default=0, description="DB offset for X coordinate (REAL)")
    position_y_offset: int = Field(default=4, description="DB offset for Y coordinate (REAL)")
    position_z_offset: int = Field(default=8, description="DB offset for Z coordinate (REAL)")
    pitch_offset: int = Field(default=12, description="DB offset for pitch (REAL)")
    roll_offset: int = Field(default=16, description="DB offset for roll (REAL)")
    yaw_offset: int = Field(default=20, description="DB offset for yaw (REAL)")
    cutterhead_rpm_offset: int = Field(default=24, description="DB offset for cutterhead RPM (REAL)")
    thrust_pressure_offset: int = Field(default=28, description="DB offset for thrust pressure (REAL)")
    advance_speed_offset: int = Field(default=32, description="DB offset for advance speed (REAL)")
    torque_offset: int = Field(default=36, description="DB offset for torque (REAL)")
    shield_tail_seal_pressure_offset: int = Field(default=40, description="DB offset for shield tail seal (REAL)")
    grout_pressure_offset: int = Field(default=44, description="DB offset for grout pressure (REAL)")
    screw_conveyor_speed_offset: int = Field(default=48, description="DB offset for screw conveyor (REAL)")
    status_word_offset: int = Field(default=52, description="DB offset for status word (DWORD)")
