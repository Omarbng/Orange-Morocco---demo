import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { tokens } from "./tokens";

// ──────────────────────────────────────────────────────────────
// 3D backdrop — pulsing EVA core (icosahedron with vertex
// displacement) + orbiting particle field. Pure visuals, no
// text overlays; rendered behind the real CallScreen UI.
// ──────────────────────────────────────────────────────────────

const EvaCore: React.FC<{ frame: number }> = ({ frame }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => new THREE.IcosahedronGeometry(1.4, 4), []);
  const originalPositions = useMemo(
    () => geo.attributes.position.array.slice(),
    [geo]
  );

  useFrame(() => {
    if (!meshRef.current || !innerRef.current) return;

    const positions = geo.attributes.position.array as Float32Array;
    const t = frame / 30;
    for (let i = 0; i < positions.length; i += 3) {
      const ox = originalPositions[i] as number;
      const oy = originalPositions[i + 1] as number;
      const oz = originalPositions[i + 2] as number;
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const nx = ox / len;
      const ny = oy / len;
      const nz = oz / len;
      const noise =
        Math.sin(ox * 3 + t * 2) * 0.08 +
        Math.cos(oy * 4 + t * 1.5) * 0.06 +
        Math.sin(oz * 5 + t) * 0.05;
      const pulse = Math.sin(t * 2) * 0.05;
      const d = 1 + noise + pulse;
      positions[i] = nx * len * d;
      positions[i + 1] = ny * len * d;
      positions[i + 2] = nz * len * d;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    meshRef.current.rotation.y = frame * 0.01;
    meshRef.current.rotation.x = Math.sin(frame * 0.007) * 0.3;
    innerRef.current.rotation.y = -frame * 0.02;
    innerRef.current.rotation.z = frame * 0.015;
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geo}>
        <meshStandardMaterial
          color={tokens.accent}
          emissive={tokens.accent}
          emissiveIntensity={1.2}
          wireframe
        />
      </mesh>
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.8, 2]} />
        <meshStandardMaterial
          color={tokens.accentSoft}
          emissive={tokens.accentSoft}
          emissiveIntensity={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={tokens.accentSoft}
          emissiveIntensity={3}
        />
      </mesh>
    </group>
  );
};

const ParticleField: React.FC<{ frame: number }> = ({ frame }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 400;

  const particles = useMemo(() => {
    const arr: { r: number; theta: number; phi: number; speed: number; size: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        r: 2.5 + Math.random() * 4,
        theta: Math.random() * Math.PI * 2,
        phi: Math.random() * Math.PI,
        speed: 0.2 + Math.random() * 0.8,
        size: 0.02 + Math.random() * 0.04,
      });
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();
    const t = frame / 30;
    for (let i = 0; i < count; i++) {
      const p = particles[i]!;
      const theta = p.theta + t * p.speed * 0.3;
      const phi = p.phi + Math.sin(t * p.speed) * 0.3;
      const x = p.r * Math.sin(phi) * Math.cos(theta);
      const y = p.r * Math.cos(phi);
      const z = p.r * Math.sin(phi) * Math.sin(theta);
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(p.size * (1 + Math.sin(t + i) * 0.3));
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.rotation.y = t * 0.05;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={tokens.accentSoft} toneMapped={false} />
    </instancedMesh>
  );
};

const AnimatedCamera: React.FC<{ frame: number }> = ({ frame }) => {
  useFrame((state) => {
    const t = frame / 150;
    state.camera.position.z = interpolate(t, [0, 1], [7, 4.5], {
      easing: (x) => x * x * (3 - 2 * x),
      extrapolateRight: "clamp",
    });
    state.camera.position.x = Math.sin(frame * 0.008) * 0.3;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} color={tokens.accentSoft} intensity={8} />
      <pointLight position={[-5, -3, 3]} color={tokens.accent} intensity={6} />
      <pointLight position={[0, 0, 3]} color="#FFFFFF" intensity={2} />
      <AnimatedCamera frame={frame} />
      <EvaCore frame={frame} />
      <ParticleField frame={frame} />
      <fog attach="fog" args={[tokens.bgDeep, 4, 10]} />
    </>
  );
};

export const EvaHero3D: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: tokens.bgDeep }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 45, position: [0, 0, 7] }}>
        <Scene />
      </ThreeCanvas>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
