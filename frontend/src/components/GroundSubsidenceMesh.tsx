import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTBMStore } from "../store/tbmStore";

const GROUND_SIZE_X = 80;
const GROUND_SIZE_Z = 120;
const GROUND_SEGMENTS_X = 80;
const GROUND_SEGMENTS_Z = 120;
const GROUND_Y = 12.0;

const vertexShader = /* glsl */ `
  uniform float uSettlementMax;
  uniform float uTroughWidth;
  uniform float uTunnelDepth;
  uniform vec3 uTBMPosition;
  uniform float uVolumeLoss;
  uniform float uTime;

  varying float vSettlement;
  varying float vDistanceToCenter;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec3 pos = position;

    float dx = pos.x - uTBMPosition.x;
    float dz = pos.z - uTBMPosition.z;

    float distX = abs(dx);
    float distZ = abs(dz);

    float i = max(uTroughWidth, 0.1);

    float gaussianX = exp(-(distX * distX) / (2.0 * i * i));
    float gaussianZ = exp(-(distZ * distZ) / (2.0 * i * i * 4.0));

    float settlementMm = uSettlementMax * gaussianX * gaussianZ;

    float settlementM = settlementMm / 1000.0;

    settlementM *= smoothstep(0.0, 1.0, uVolumeLoss);

    pos.y -= settlementM;

    vSettlement = settlementMm;
    vDistanceToCenter = length(vec2(dx, dz));

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uSettlementMax;
  uniform float uTime;

  varying float vSettlement;
  varying float vDistanceToCenter;
  varying vec2 vUv;

  void main() {
    float warningThreshold = uSettlementMax * 0.7;

    vec3 baseColor = vec3(0.18, 0.30, 0.15);

    float t = smoothstep(0.0, max(uSettlementMax, 0.1), vSettlement);
    vec3 settleColor = mix(
      vec3(0.25, 0.40, 0.20),
      vec3(0.60, 0.25, 0.08),
      t
    );

    if (vSettlement > warningThreshold && uSettlementMax > 1.0) {
      float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
      float dangerT = smoothstep(warningThreshold, uSettlementMax, vSettlement);
      settleColor = mix(settleColor, vec3(0.9, 0.1, 0.1), dangerT * (0.5 + 0.5 * pulse));
    }

    vec3 gridColor = settleColor * 0.6;
    float gridX = abs(fract(vUv.x * 80.0 - 0.5) - 0.5);
    float gridZ = abs(fract(vUv.y * 120.0 - 0.5) - 0.5);
    float gridLine = 1.0 - smoothstep(0.0, 0.04, min(gridX, gridZ));
    settleColor = mix(settleColor, gridColor, gridLine * 0.4);

    gl_FragColor = vec4(settleColor, 0.85);
  }
`;

export default function GroundSubsidenceMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      GROUND_SIZE_X,
      GROUND_SIZE_Z,
      GROUND_SEGMENTS_X,
      GROUND_SEGMENTS_Z
    );
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uSettlementMax: { value: 0.0 },
      uTroughWidth: { value: 5.4 },
      uTunnelDepth: { value: 12.0 },
      uTBMPosition: { value: new THREE.Vector3(0, 0, 5) },
      uVolumeLoss: { value: 0.0 },
      uTime: { value: 0.0 },
    }),
    []
  );

  useFrame((state, delta) => {
    if (!materialRef.current) return;
    const telemetry = useTBMStore.getState().telemetry;

    materialRef.current.uniforms.uSettlementMax.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uSettlementMax.value,
      telemetry.settlement_max,
      1 - Math.pow(0.92, delta * 60)
    );
    materialRef.current.uniforms.uTroughWidth.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uTroughWidth.value,
      telemetry.trough_width,
      1 - Math.pow(0.92, delta * 60)
    );
    materialRef.current.uniforms.uTunnelDepth.value = telemetry.tunnel_depth;
    materialRef.current.uniforms.uTBMPosition.value.set(0, GROUND_Y, 5);
    materialRef.current.uniforms.uVolumeLoss.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uVolumeLoss.value,
      telemetry.volume_loss / 5.0,
      1 - Math.pow(0.92, delta * 60)
    );
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, GROUND_Y, 5]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
