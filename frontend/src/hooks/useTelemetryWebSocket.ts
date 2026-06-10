import { useEffect, useRef, useCallback } from "react";
import { useTBMStore } from "../store/tbmStore";
import type { TBMTelemetry } from "../types/telemetry";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8765";
const RECONNECT_DELAY = 3000;

export function useTelemetryWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateTelemetry = useTBMStore((s) => s.updateTelemetry);
  const setConnected = useTBMStore((s) => s.setConnected);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: TBMTelemetry = JSON.parse(event.data);
        updateTelemetry(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [updateTelemetry, setConnected]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
