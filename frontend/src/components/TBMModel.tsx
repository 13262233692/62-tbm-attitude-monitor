import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTBMStore } from "../store/tbmStore";

function Cutterhead() {
  const groupRef = useRef<THREE.Group>(null);
  const spokeCount = 8;
  const outerRadius = 3.25;
  const spokeWidth = 0.4;
  const spokeDepth = 0.6;

  const spokeGeometry = useMemo(() => {
    return new THREE.BoxGeometry(spokeWidth, outerRadius * 2 - 0.5, spokeDepth);
  }, []);

  const rimGeometry = useMemo(() => {
    return new THREE.TorusGeometry(outerRadius, 0.25, 12, 64);
  }, []);

  const centerGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(1.0, 1.0, spokeDepth, 32);
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        metalness: 0.85,
        roughness: 0.25,
      }),
    []
  );

  const accentMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.7,
        roughness: 0.3,
      }),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const rpm = useTBMStore.getState().telemetry.cutterhead_rpm;
    const angularVelocity = (rpm / 60) * Math.PI * 2;
    const incrementalQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      angularVelocity * delta
    );
    groupRef.current.quaternion.premultiply(incrementalQuat);
  });

  return (
    <group ref={groupRef} position={[0, 0, -0.3]}>
      <mesh geometry={centerGeometry} material={accentMaterial} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={rimGeometry} material={material} rotation={[Math.PI / 2, 0, 0]} />
      {Array.from({ length: spokeCount }).map((_, i) => {
        const angle = (i / spokeCount) * Math.PI;
        return (
          <mesh
            key={i}
            geometry={spokeGeometry}
            material={i % 2 === 0 ? material : accentMaterial}
            rotation={[0, 0, angle]}
          />
        );
      })}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const r = outerRadius * 0.88;
        return (
          <mesh key={`bit-${i}`} position={[Math.cos(angle) * r, Math.sin(angle) * r, -0.2]}>
            <boxGeometry args={[0.15, 0.15, 0.4]} />
            <meshStandardMaterial color={0x1c1917} metalness={0.9} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

function MainDrive() {
  const geometry = useMemo(() => new THREE.CylinderGeometry(4.2, 4.2, 2.0, 48), []);
  const ringGeometry = useMemo(() => new THREE.TorusGeometry(3.5, 0.3, 12, 48), []);

  return (
    <group position={[0, 0, 1.0]}>
      <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={0x78716c} metalness={0.8} roughness={0.3} transparent opacity={0.6} />
      </mesh>
      <mesh geometry={ringGeometry} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.9]}>
        <meshStandardMaterial color={0xfbbf24} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh geometry={ringGeometry} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.9]}>
        <meshStandardMaterial color={0xfbbf24} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function ShieldBody() {
  const frontShieldGeo = useMemo(
    () => new THREE.CylinderGeometry(3.5, 3.5, 5.0, 48, 1, true),
    []
  );
  const middleShieldGeo = useMemo(
    () => new THREE.CylinderGeometry(3.5, 3.5, 4.0, 48, 1, true),
    []
  );
  const tailShieldGeo = useMemo(
    () => new THREE.CylinderGeometry(3.45, 3.5, 3.5, 48, 1, true),
    []
  );

  const shieldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x57534e,
        metalness: 0.75,
        roughness: 0.35,
        side: THREE.DoubleSide,
      }),
    []
  );

  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.6,
        roughness: 0.4,
      }),
    []
  );

  const ringGeo = useMemo(() => new THREE.TorusGeometry(3.55, 0.15, 8, 48), []);

  return (
    <group position={[0, 0, 5.0]}>
      <mesh geometry={frontShieldGeo} material={shieldMat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
      <mesh geometry={middleShieldGeo} material={shieldMat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 4.5]} />
      <mesh geometry={tailShieldGeo} material={shieldMat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 8.25]} />

      {[1.0, 2.5, 4.0, 5.5, 7.0, 8.5].map((z, i) => (
        <mesh key={`ring-${i}`} geometry={ringGeo} material={ringMat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]} />
      ))}

      <mesh position={[0, -3.0, 4.0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[1.5, 10.0, 0.8]} />
        <meshStandardMaterial color={0x44403c} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

function SegmentErector() {
  const groupRef = useRef<THREE.Group>(null);
  const erectorArmGeo = useMemo(() => new THREE.BoxGeometry(0.4, 3.0, 0.4), []);
  const erectorHeadGeo = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const vacuumPadGeo = useMemo(() => new THREE.CylinderGeometry(0.6, 0.6, 0.15, 16), []);

  const armMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.4 }),
    []
  );

  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color:0xfbbf24, metalness: 0.7, roughness: 0.3 }),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isRingBuilding = useTBMStore.getState().telemetry.is_ring_building;
    if (isRingBuilding) {
      const incrementalQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        0.3 * delta
      );
      groupRef.current.quaternion.premultiply(incrementalQuat);
    }
  });

  return (
    <group position={[0, 0, 11.0]}>
      <mesh>
        <cylinderGeometry args={[2.8, 2.8, 1.5, 32]} />
        <meshStandardMaterial color={0x78716c} metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={groupRef}>
        <mesh geometry={erectorArmGeo} material={armMat} position={[0, 1.5, 0]} />
        <mesh geometry={erectorHeadGeo} material={headMat} position={[0, 3.2, 0]} />
        <mesh geometry={vacuumPadGeo} material={headMat} position={[0, 3.2, -0.3]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

function ThrustCylinders() {
  const cylinderGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 6.0, 8), []);
  const pistonGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.08, 3.0, 8), []);
  const cylinderMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.2 }),
    []
  );
  const pistonMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.9, roughness: 0.15 }),
    []
  );

  const positions = useMemo(() => {
    const pts: [number, number, number][] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 3.2;
      pts.push([Math.cos(angle) * r, Math.sin(angle) * r, 10.0]);
    }
    return pts;
  }, []);

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={`thrust-${i}`} position={pos}>
          <mesh geometry={cylinderGeo} material={cylinderMat} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={pistonGeo} material={pistonMat} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -4.5]} />
        </group>
      ))}
    </group>
  );
}

function ScrewConveyor() {
  const tubePath = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -2.5, 6),
      new THREE.Vector3(0.5, -2.8, 8),
      new THREE.Vector3(1.0, -3.5, 10),
      new THREE.Vector3(1.5, -4.5, 12),
      new THREE.Vector3(2.0, -5.5, 14),
    ]);
    return curve;
  }, []);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(tubePath, 32, 0.5, 12, false), [tubePath]);
  const helixPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = tubePath.getPoint(t);
      const angle = t * Math.PI * 12;
      pts.push(
        new THREE.Vector3(p.x + Math.cos(angle) * 0.35, p.y + Math.sin(angle) * 0.35, p.z)
      );
    }
    return pts;
  }, [tubePath]);

  const helixCurve = useMemo(() => new THREE.CatmullRomCurve3(helixPoints), [helixPoints]);
  const helixGeo = useMemo(() => new THREE.TubeGeometry(helixCurve, 200, 0.04, 6, false), [helixCurve]);

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial color={0x57534e} metalness={0.7} roughness={0.4} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={helixGeo}>
        <meshStandardMaterial color={0x9ca3af} metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ConveyorBelt() {
  return (
    <group position={[2.5, -6.0, 14.0]} rotation={[0.15, 0.3, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 0.1, 12.0]} />
        <meshStandardMaterial color={0x374151} metalness={0.5} roughness={0.5} />
      </mesh>
      {[-5.5, -3.5, -1.5, 0.5, 2.5, 4.5].map((z, i) => (
        <mesh key={`roller-${i}`} position={[0, -0.15, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 1.6, 8]} />
          <meshStandardMaterial color={0x6b7280} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export default function TBMModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const smoothedQuat = useTBMStore.getState().slerpTick(delta);
    groupRef.current.quaternion.copy(smoothedQuat);
  });

  return (
    <group ref={groupRef}>
      <Cutterhead />
      <MainDrive />
      <ShieldBody />
      <SegmentErector />
      <ThrustCylinders />
      <ScrewConveyor />
      <ConveyorBelt />
    </group>
  );
}
