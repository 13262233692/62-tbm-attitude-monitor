import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import TBMModel from "./TBMModel";
import TunnelEnvironment from "./TunnelEnvironment";
import SceneLighting from "./SceneLighting";

export default function TBMScene() {
  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: 3,
        toneMappingExposure: 1.2,
      }}
      style={{ width: "100%", height: "100%", background: "#0a0a0f" }}
    >
      <PerspectiveCamera makeDefault position={[12, 8, 15]} fov={50} near={0.1} far={500} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={5}
        maxDistance={80}
        target={[0, 0, 5]}
      />
      <fog attach="fog" args={["#0a0a0f", 30, 120]} />
      <SceneLighting />
      <TBMModel />
      <TunnelEnvironment />
    </Canvas>
  );
}
