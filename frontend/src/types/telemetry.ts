export interface TBMTelemetry {
  timestamp: number;

  position_x: number;
  position_y: number;
  position_z: number;

  pitch: number;
  roll: number;
  yaw: number;

  cutterhead_rpm: number;
  thrust_pressure: number;

  advance_speed: number;
  torque: number;

  shield_tail_seal_pressure: number;
  grout_pressure: number;
  screw_conveyor_speed: number;

  is_excavating: boolean;
  is_ring_building: boolean;
}

export const DEFAULT_TELEMETRY: TBMTelemetry = {
  timestamp: 0,
  position_x: 0,
  position_y: 0,
  position_z: 0,
  pitch: 0,
  roll: 0,
  yaw: 0,
  cutterhead_rpm: 0,
  thrust_pressure: 0,
  advance_speed: 0,
  torque: 0,
  shield_tail_seal_pressure: 0,
  grout_pressure: 0,
  screw_conveyor_speed: 0,
  is_excavating: false,
  is_ring_building: false,
};
