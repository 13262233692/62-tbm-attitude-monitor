import { useTBMStore } from "../store/tbmStore";
import type { TBMTelemetry } from "../types/telemetry";

function formatNumber(val: number, decimals: number = 2): string {
  return val.toFixed(decimals);
}

function MetricCard({
  label,
  value,
  unit,
  color,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: string;
}) {
  return (
    <div className="metric-card" style={{ borderLeftColor: color }}>
      <div className="metric-header">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value-row">
        <span className="metric-value" style={{ color }}>
          {value}
        </span>
        <span className="metric-unit">{unit}</span>
      </div>
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`status-badge ${active ? "status-active" : "status-idle"}`}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}

function AttitudeGauge({ pitch, roll, yaw }: { pitch: number; roll: number; yaw: number }) {
  const rollOffset = (roll / 5) * 40;
  const pitchOffset = (pitch / 5) * 40;

  return (
    <div className="attitude-gauge">
      <div className="gauge-title">姿态仪</div>
      <div className="gauge-container">
        <div className="gauge-horizon" style={{ transform: `translateY(${pitchOffset}px) rotate(${-roll}deg)` }} />
        <div className="gauge-crosshair" />
        <div className="gauge-wings" />
      </div>
      <div className="gauge-readings">
        <span>P {formatNumber(pitch, 3)}°</span>
        <span>R {formatNumber(roll, 3)}°</span>
        <span>Y {formatNumber(yaw, 3)}°</span>
      </div>
    </div>
  );
}

function CoordinateDisplay({ t }: { t: TBMTelemetry }) {
  return (
    <div className="coordinate-display">
      <div className="coord-title">空间坐标</div>
      <div className="coord-row">
        <span className="coord-axis" style={{ color: "#ef4444" }}>X</span>
        <span className="coord-value">{formatNumber(t.position_x, 3)}</span>
        <span className="coord-unit">m</span>
      </div>
      <div className="coord-row">
        <span className="coord-axis" style={{ color: "#22c55e" }}>Y</span>
        <span className="coord-value">{formatNumber(t.position_y, 3)}</span>
        <span className="coord-unit">m</span>
      </div>
      <div className="coord-row">
        <span className="coord-axis" style={{ color: "#3b82f6" }}>Z</span>
        <span className="coord-value">{formatNumber(t.position_z, 3)}</span>
        <span className="coord-unit">m</span>
      </div>
    </div>
  );
}

export default function TelemetryDashboard() {
  const telemetry = useTBMStore((s) => s.telemetry);
  const connected = useTBMStore((s) => s.connected);
  const t = telemetry;

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>盾构机数字孪生系统</h1>
          <span className="dashboard-subtitle">TBM Digital Twin Monitor</span>
        </div>
        <div className="dashboard-status">
          <StatusBadge active={connected} label={connected ? "在线" : "离线"} />
          <StatusBadge active={t.is_excavating} label="掘进" />
          <StatusBadge active={t.is_ring_building} label="拼装" />
        </div>
      </div>

      <div className="dashboard-left">
        <CoordinateDisplay t={t} />
        <AttitudeGauge pitch={t.pitch} roll={t.roll} yaw={t.yaw} />
      </div>

      <div className="dashboard-right">
        <div className="metrics-grid">
          <MetricCard
            label="刀盘转速"
            value={formatNumber(t.cutterhead_rpm, 1)}
            unit="RPM"
            color="#f59e0b"
            icon="⚙"
          />
          <MetricCard
            label="推进压力"
            value={formatNumber(t.thrust_pressure, 1)}
            unit="MPa"
            color="#ef4444"
            icon="▸"
          />
          <MetricCard
            label="推进速度"
            value={formatNumber(t.advance_speed, 1)}
            unit="mm/min"
            color="#22c55e"
            icon="→"
          />
          <MetricCard
            label="刀盘扭矩"
            value={formatNumber(t.torque, 0)}
            unit="kN·m"
            color="#8b5cf6"
            icon="⟳"
          />
          <MetricCard
            label="盾尾密封"
            value={formatNumber(t.shield_tail_seal_pressure, 2)}
            unit="MPa"
            color="#06b6d4"
            icon="◈"
          />
          <MetricCard
            label="注浆压力"
            value={formatNumber(t.grout_pressure, 2)}
            unit="MPa"
            color="#ec4899"
            icon="◉"
          />
          <MetricCard
            label="螺旋机转速"
            value={formatNumber(t.screw_conveyor_speed, 1)}
            unit="RPM"
            color="#14b8a6"
            icon="↻"
          />
          <MetricCard
            label="体积损失率"
            value={formatNumber(t.volume_loss, 2)}
            unit="%"
            color={t.volume_loss > 2.0 ? "#ef4444" : "#f59e0b"}
            icon="▼"
          />
          <MetricCard
            label="最大沉降"
            value={formatNumber(t.settlement_max, 1)}
            unit="mm"
            color={t.settlement_max > 10.0 ? "#ef4444" : "#8b5cf6"}
            icon="⌇"
          />
          <MetricCard
            label="沉降槽宽"
            value={formatNumber(t.trough_width, 1)}
            unit="m"
            color="#06b6d4"
            icon="∿"
          />
        </div>
      </div>

      <div className="dashboard-footer">
        <span>采样时间: {t.timestamp > 0 ? new Date(t.timestamp * 1000).toLocaleTimeString("zh-CN") : "--:--:--"}</span>
      </div>
    </div>
  );
}
