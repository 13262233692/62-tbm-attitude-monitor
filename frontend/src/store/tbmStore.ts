import { create } from "zustand";
import type { TBMTelemetry } from "../types/telemetry";
import { DEFAULT_TELEMETRY } from "../types/telemetry";

interface TBMStore {
  telemetry: TBMTelemetry;
  connected: boolean;
  updateTelemetry: (data: TBMTelemetry) => void;
  setConnected: (v: boolean) => void;
}

export const useTBMStore = create<TBMStore>((set) => ({
  telemetry: DEFAULT_TELEMETRY,
  connected: false,
  updateTelemetry: (data) => set({ telemetry: data }),
  setConnected: (v) => set({ connected: v }),
}));
