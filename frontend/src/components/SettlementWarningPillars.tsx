import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTBMStore } from "../store/tbmStore";

const GROUND_Y = 12.0;
const TBM_Z = 5.0;
const WARNING_THRESHOLD_MM = 5.0;
const PILLAR_RADIUS = 0.3;
const PILLAR_HEIGHT = 8.0;

interface PillarData {
  position: [number, number, number];
  settlement: number;
}

function WarningPillar({ position, settlement }: PillarData) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const pillarGeo = useMemo(() => new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, PILLAR_HEIGHT, 8), []);
  const ringGeo = useMemo(() => new THREE.TorusGeometry(0.8, 0.08, 8, 24), []);

  const pillarMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      }),
    []
  );

  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.8,
      }),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4.0);
    groupRef.current.scale.y = 0.7 + 0.3 * pulse;

    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.8 + 0.4 * pulse);
      ringRef.current.rotation.x = Math.PI / 2;
    }
  });

  const intensity = Math.min(settlement / 30.0, 1.0);

  return (
    <group ref={groupRef} position={position}>
      <mesh geometry={pillarGeo} material={pillarMat} position={[0, PILLAR_HEIGHT / 2, 0]} />
      <mesh ref={ringRef} geometry={ringGeo} material={ringMat} position={[0, PILLAR_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <pointLight
        position={[0, PILLAR_HEIGHT + 1, 0]}
        color={0xef4444}
        intensity={intensity * 3}
        distance={8}
        decay={2}
      />
    </group>
  );
}

export default function SettlementWarningPillars() {
  const pillarPositions = useMemo<PillarData[]>(() => {
    const pillars: PillarData[] = [];

    const offsets: [number, number][] = [
      [0, 0],
      [4, -3],
      [-4, -3],
      [6, 3],
      [-6, 3],
      [2, -8],
      [-2, -8],
      [8, 0],
      [-8, 0],
      [0, 8],
    ];

    const i = 5.4;

    for (const [x, z] of offsets) {
      const distX = Math.abs(x);
      const distZ = Math.abs(z);
      const gaussianX = Math.exp(-(distX * distX) / (2 * i * i));
      const gaussianZ = Math.exp(-(distZ * distZ) / (2 * i * i * 4));
      const settlement = 15.0 * gaussianX * gaussianZ;

      if (settlement > WARNING_THRESHOLD_MM * 0.5) {
        pillars.push({
          position: [x, GROUND_Y, TBM_Z + z],
          settlement,
        });
      }
    }

    return pillars;
  }, []);

  const telemetry = useTBMStore((s) => s.telemetry);

  if (telemetry.settlement_max < WARNING_THRESHOLD_MM) {
    return null;
  }

  return (
    <group>
      {pillarPositions.map((pillar, i) => (
        <WarningPillar key={i} position={pillar.position} settlement={pillar.settlement * (telemetry.settlement_max / 15.0)} />
      ))}
    </group>
  );
}
