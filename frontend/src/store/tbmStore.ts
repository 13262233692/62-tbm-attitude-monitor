import { create } from "zustand";
import * as THREE from "three";
import type { TBMTelemetry } from "../types/telemetry";
import { DEFAULT_TELEMETRY } from "../types/telemetry";

const DEG2RAD = Math.PI / 180;
const SLERP_FACTOR = 0.08;

interface TBMStore {
  telemetry: TBMTelemetry;
  connected: boolean;
  targetQuaternion: THREE.Quaternion;
  currentQuaternion: THREE.Quaternion;
  updateTelemetry: (data: TBMTelemetry) => void;
  setConnected: (v: boolean) => void;
  slerpTick: (delta: number) => THREE.Quaternion;
}

function eulerToQuaternion(pitchDeg: number, rollDeg: number, yawDeg: number): THREE.Quaternion {
  const euler = new THREE.Euler(
    pitchDeg * DEG2RAD,
    yawDeg * DEG2RAD,
    rollDeg * DEG2RAD,
    "YXZ"
  );
  return new THREE.Quaternion().setFromEuler(euler);
}

const IDENTITY_QUAT = new THREE.Quaternion();

export const useTBMStore = create<TBMStore>((set, get) => ({
  telemetry: DEFAULT_TELEMETRY,
  connected: false,
  targetQuaternion: IDENTITY_QUAT.clone(),
  currentQuaternion: IDENTITY_QUAT.clone(),

  updateTelemetry: (data) => {
    const targetQ = eulerToQuaternion(data.pitch, data.roll, data.yaw);
    set({
      telemetry: data,
      targetQuaternion: targetQ,
    });
  },

  setConnected: (v) => set({ connected: v }),

  slerpTick: (delta: number) => {
    const { currentQuaternion, targetQuaternion } = get();
    const factor = 1 - Math.pow(1 - SLERP_FACTOR, delta * 60);
    const result = currentQuaternion.clone().slerp(targetQuaternion, factor);
    set({ currentQuaternion: result });
    return result;
  },
}));
