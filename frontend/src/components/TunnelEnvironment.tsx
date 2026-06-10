import { useMemo } from "react";
import * as THREE from "three";

export default function TunnelEnvironment() {
  const tunnelLength = 200;
  const tunnelRadius = 4.0;
  const segments = 80;

  const tunnelGeo = useMemo(
    () => new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, tunnelLength, segments, 1, true),
    []
  );

  const tunnelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x292524,
        side: THREE.BackSide,
        roughness: 0.95,
        metalness: 0.05,
      }),
    []
  );

  const segmentLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const ringSpacing = 1.5;
    const ringCount = Math.floor(tunnelLength / ringSpacing);

    for (let i = 0; i < ringCount; i++) {
      const z = -tunnelLength / 2 + i * ringSpacing;
      lines.push(
        <mesh key={`ring-${i}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[tunnelRadius + 0.02, 0.03, 4, segments]} />
          <meshStandardMaterial color={0x44403c} metalness={0.3} roughness={0.7} />
        </mesh>
      );
    }

    const longitudinalCount = 8;
    for (let i = 0; i < longitudinalCount; i++) {
      const angle = (i / longitudinalCount) * Math.PI * 2;
      lines.push(
        <mesh
          key={`long-${i}`}
          position={[
            Math.cos(angle) * (tunnelRadius + 0.01),
            Math.sin(angle) * (tunnelRadius + 0.01),
            0,
          ]}
          rotation={[0, 0, angle]}
        >
          <boxGeometry args={[0.03, 0.03, tunnelLength]} />
          <meshStandardMaterial color={0x44403c} />
        </mesh>
      );
    }
    return lines;
  }, []);

  const groundGeo = useMemo(
    () => new THREE.PlaneGeometry(tunnelRadius * 2 * 0.6, tunnelLength),
    []
  );

  return (
    <group position={[0, 0, tunnelLength / 2 - 10]}>
      <mesh geometry={tunnelGeo} material={tunnelMat} rotation={[Math.PI / 2, 0, 0]} />
      {segmentLines}
      <mesh geometry={groundGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -tunnelRadius + 0.15, 0]}>
        <meshStandardMaterial color={0x1c1917} roughness={0.98} metalness={0.02} />
      </mesh>
    </group>
  );
}
