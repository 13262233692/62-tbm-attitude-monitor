import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function SceneLighting() {
  const spotLightRef = useRef<THREE.SpotLight>(null);

  useFrame(({ camera }) => {
    if (spotLightRef.current) {
      spotLightRef.current.position.copy(camera.position);
      spotLightRef.current.target.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z - 15
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} color={0x404050} />

      <directionalLight
        position={[5, 10, -10]}
        intensity={0.4}
        color={0xfff5e6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <spotLight
        ref={spotLightRef}
        intensity={2.5}
        angle={0.6}
        penumbra={0.5}
        color={0xfff5e6}
        distance={60}
        castShadow
      />

      <pointLight position={[0, 0, -2]} intensity={1.5} color={0xffaa00} distance={15} decay={2} />
      <pointLight position={[0, 0, 5]} intensity={0.8} color={0xffffff} distance={20} decay={2} />
      <pointLight position={[0, 0, 15]} intensity={0.6} color={0xfff5e6} distance={25} decay={2} />
    </>
  );
}
