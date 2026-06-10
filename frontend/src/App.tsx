import TBMScene from "./components/TBMScene";
import TelemetryDashboard from "./components/TelemetryDashboard";
import { useTelemetryWebSocket } from "./hooks/useTelemetryWebSocket";
import "./App.css";

function App() {
  useTelemetryWebSocket();

  return (
    <div className="app-root">
      <div className="scene-container">
        <TBMScene />
      </div>
      <TelemetryDashboard />
    </div>
  );
}

export default App;
