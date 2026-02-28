'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface VenueLayoutConfig {
  /** Total floor size (width and depth) */
  floorSize?: [number, number];
  /** Whether to show the stage area */
  showStage?: boolean;
  /** Whether to show the dance floor */
  showDanceFloor?: boolean;
  /** Whether to show the bar */
  showBar?: boolean;
  /** Whether to show the terrace area */
  showTerrace?: boolean;
  /** Whether to show VIP rope boundaries */
  showVipBoundaries?: boolean;
  /** Whether to show the entrance */
  showEntrance?: boolean;
  /** Whether to show the grid */
  showGrid?: boolean;
  /** Custom stage position */
  stagePosition?: [number, number, number];
  /** Custom dance floor position */
  danceFloorPosition?: [number, number, number];
  /** Custom bar position */
  barPosition?: [number, number, number];
  /** Custom terrace bounds */
  terraceBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** VIP boundary sectors */
  vipSectors?: Array<{
    name: string;
    color: string;
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  }>;
}

export interface VenueElementsProps {
  config?: VenueLayoutConfig;
}

// ──────────────────────────────────────────────────────────
// Defaults
// ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<VenueLayoutConfig> = {
  floorSize: [30, 20],
  showStage: true,
  showDanceFloor: true,
  showBar: true,
  showTerrace: true,
  showVipBoundaries: true,
  showEntrance: true,
  showGrid: false,
  stagePosition: [0, 0, -8.5],
  danceFloorPosition: [0, -0.05, -4],
  barPosition: [-12, 0, 0],
  terraceBounds: { minX: 8, maxX: 15, minZ: 4, maxZ: 10 },
  vipSectors: [
    {
      name: 'VIP Gold',
      color: '#f59e0b',
      bounds: { minX: -7, maxX: -2, minZ: -2, maxZ: 4 },
    },
    {
      name: 'VIP Platinum',
      color: '#a78bfa',
      bounds: { minX: 2, maxX: 7, minZ: -2, maxZ: 4 },
    },
  ],
};

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────

/** Dark floor with subtle reflective material */
function Floor({ size }: { size: [number, number] }) {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size[0], size[1]]} />
        <meshStandardMaterial
          color="#0a0a14"
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>
      {/* Subtle grid overlay */}
      <gridHelper
        args={[Math.max(size[0], size[1]), Math.max(size[0], size[1]) * 2, '#1a1a2e', '#111122']}
        position={[0, 0.001, 0]}
      />
    </group>
  );
}

/** Elevated stage platform with colored spotlight effects */
function Stage({ position }: { position: [number, number, number] }) {
  const spotLight1Ref = useRef<THREE.SpotLight>(null);
  const spotLight2Ref = useRef<THREE.SpotLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (spotLight1Ref.current) {
      spotLight1Ref.current.color.setHSL(((t * 0.1) % 1), 0.8, 0.5);
    }
    if (spotLight2Ref.current) {
      spotLight2Ref.current.color.setHSL(((t * 0.1 + 0.5) % 1), 0.8, 0.5);
    }
  });

  return (
    <group position={position}>
      {/* Stage platform */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.4, 3]} />
        <meshStandardMaterial
          color="#1a1025"
          metalness={0.5}
          roughness={0.3}
          emissive="#2a1040"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Stage front edge (neon strip) */}
      <mesh position={[0, 0.41, 1.5]}>
        <boxGeometry args={[8, 0.03, 0.05]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={3}
        />
      </mesh>

      {/* Stage side neon strips */}
      <mesh position={[-4, 0.41, 0]}>
        <boxGeometry args={[0.05, 0.03, 3]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={3} />
      </mesh>
      <mesh position={[4, 0.41, 0]}>
        <boxGeometry args={[0.05, 0.03, 3]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={3} />
      </mesh>

      {/* Spotlights */}
      <spotLight
        ref={spotLight1Ref}
        position={[-2, 5, 2]}
        angle={0.4}
        penumbra={0.6}
        intensity={3}
        distance={15}
        castShadow
        color="#a855f7"
      />
      <spotLight
        ref={spotLight2Ref}
        position={[2, 5, 2]}
        angle={0.4}
        penumbra={0.6}
        intensity={3}
        distance={15}
        castShadow
        color="#ec4899"
      />

      {/* DJ booth representation */}
      <mesh position={[0, 0.65, -0.5]} castShadow>
        <boxGeometry args={[2, 0.5, 1]} />
        <meshStandardMaterial
          color="#111122"
          metalness={0.6}
          roughness={0.3}
          emissive="#6b21a8"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, 0.55, 1.8]}
        fontSize={0.35}
        color="#a855f7"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        ESCENARIO
      </Text>
    </group>
  );
}

/** Dance floor with animated color cycling effect */
function DanceFloor({ position }: { position: [number, number, number] }) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (materialRef.current) {
      materialRef.current.emissive.setHSL((t * 0.05) % 1, 0.7, 0.15);
      materialRef.current.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.15;
    }
    if (lightRef.current) {
      lightRef.current.color.setHSL((t * 0.05) % 1, 0.8, 0.5);
      lightRef.current.intensity = 1.5 + Math.sin(t * 3) * 0.5;
    }
  });

  const tileCount = 6;
  const tileSize = 0.95;
  const tiles = useMemo(() => {
    const result: { pos: [number, number, number]; delay: number }[] = [];
    for (let x = 0; x < tileCount; x++) {
      for (let z = 0; z < tileCount; z++) {
        const px = (x - tileCount / 2 + 0.5) * tileSize;
        const pz = (z - tileCount / 2 + 0.5) * tileSize;
        result.push({ pos: [px, 0.005, pz], delay: (x + z) * 0.3 });
      }
    }
    return result;
  }, []);

  return (
    <group position={position}>
      {/* Recessed floor base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[tileCount * tileSize + 0.2, tileCount * tileSize + 0.2]} />
        <meshStandardMaterial color="#050510" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Dance floor tiles */}
      {tiles.map((tile, i) => (
        <DanceFloorTile key={i} position={tile.pos} delay={tile.delay} tileSize={tileSize} />
      ))}

      {/* Overhead glow */}
      <pointLight
        ref={lightRef}
        position={[0, 3, 0]}
        color="#ec4899"
        intensity={1.5}
        distance={10}
        decay={2}
      />

      {/* Label */}
      <Text
        position={[0, 0.05, tileCount * tileSize / 2 + 0.5]}
        fontSize={0.25}
        color="#ec4899"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        PISTA
      </Text>
    </group>
  );
}

/** Individual dance floor tile with animated glow */
function DanceFloorTile({
  position,
  delay,
  tileSize,
}: {
  position: [number, number, number];
  delay: number;
  tileSize: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (matRef.current) {
      const t = state.clock.elapsedTime + delay;
      matRef.current.emissive.setHSL((t * 0.08) % 1, 0.9, 0.2);
      matRef.current.emissiveIntensity = 0.15 + Math.sin(t * 1.5) * 0.15;
    }
  });

  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={[tileSize * 0.92, 0.02, tileSize * 0.92]} />
      <meshStandardMaterial
        ref={matRef}
        color="#0a0a1a"
        metalness={0.9}
        roughness={0.1}
        emissive="#6b21a8"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

/** Bar counter on the side of the venue */
function Bar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main bar counter */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.1, 8]} />
        <meshStandardMaterial
          color="#1a1020"
          metalness={0.4}
          roughness={0.5}
          emissive="#3b0764"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Bar top surface */}
      <mesh position={[0, 1.12, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.04, 8.2]} />
        <meshStandardMaterial
          color="#1c1c30"
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>

      {/* Neon edge on the front of the bar */}
      <mesh position={[0.7, 0.55, 0]}>
        <boxGeometry args={[0.03, 1.1, 8]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Bar top neon strip */}
      <mesh position={[0.7, 1.14, 0]}>
        <boxGeometry args={[0.03, 0.03, 8.2]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={3}
        />
      </mesh>

      {/* Back shelf */}
      <mesh position={[-0.9, 0.8, 0]} castShadow>
        <boxGeometry args={[0.5, 0.05, 7.5]} />
        <meshStandardMaterial color="#111122" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Bar stools */}
      {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
        <group key={z} position={[1.3, 0, z]}>
          {/* Stool seat */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.15, 0.06, 12]} />
            <meshStandardMaterial color="#2d2d44" metalness={0.3} roughness={0.6} />
          </mesh>
          {/* Stool leg */}
          <mesh position={[0, 0.27, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.06, 0.54, 8]} />
            <meshStandardMaterial color="#333355" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Ambient bar light */}
      <pointLight position={[0.5, 1.5, 0]} color="#06b6d4" intensity={1} distance={5} decay={2} />

      {/* Label */}
      <Text
        position={[1.5, 1.5, 0]}
        fontSize={0.35}
        color="#06b6d4"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
        font={undefined}
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        BAR
      </Text>
    </group>
  );
}

/** VIP sector boundary with rope/line markers */
function VipSector({
  name,
  color,
  bounds,
}: {
  name: string;
  color: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}) {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  // Rope post positions (corners)
  const posts: [number, number, number][] = [
    [bounds.minX, 0.3, bounds.minZ],
    [bounds.maxX, 0.3, bounds.minZ],
    [bounds.maxX, 0.3, bounds.maxZ],
    [bounds.minX, 0.3, bounds.maxZ],
  ];

  return (
    <group>
      {/* Semi-transparent floor overlay */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, 0.005, centerZ]}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.06}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Border lines (top edges as thin boxes) */}
      {/* Front */}
      <mesh position={[centerX, 0.01, bounds.minZ]}>
        <boxGeometry args={[width, 0.02, 0.03]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
      {/* Back */}
      <mesh position={[centerX, 0.01, bounds.maxZ]}>
        <boxGeometry args={[width, 0.02, 0.03]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
      {/* Left */}
      <mesh position={[bounds.minX, 0.01, centerZ]}>
        <boxGeometry args={[0.03, 0.02, depth]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
      {/* Right */}
      <mesh position={[bounds.maxX, 0.01, centerZ]}>
        <boxGeometry args={[0.03, 0.02, depth]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>

      {/* Rope posts */}
      {posts.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Post */}
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
            <meshStandardMaterial
              color={color}
              metalness={0.7}
              roughness={0.2}
              emissive={color}
              emissiveIntensity={0.3}
            />
          </mesh>
          {/* Post top sphere */}
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial
              color={color}
              metalness={0.8}
              roughness={0.15}
              emissive={color}
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Sector label */}
      <Text
        position={[centerX, 0.1, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
}

/** Terrace / outdoor area */
function Terrace({
  bounds,
}: {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}) {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <group>
      {/* Terrace floor (slightly different material) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, 0.003, centerZ]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#0f1520"
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Railing */}
      {/* Front railing */}
      <mesh position={[centerX, 0.45, bounds.maxZ]}>
        <boxGeometry args={[width, 0.05, 0.05]} />
        <meshStandardMaterial color="#333355" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Side railing left */}
      <mesh position={[bounds.minX, 0.45, centerZ]}>
        <boxGeometry args={[0.05, 0.05, depth]} />
        <meshStandardMaterial color="#333355" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Side railing right */}
      <mesh position={[bounds.maxX, 0.45, centerZ]}>
        <boxGeometry args={[0.05, 0.05, depth]} />
        <meshStandardMaterial color="#333355" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Railing posts */}
      {Array.from({ length: Math.ceil(width / 1.5) + 1 }).map((_, i) => (
        <mesh
          key={`front-${i}`}
          position={[bounds.minX + i * (width / Math.ceil(width / 1.5)), 0.22, bounds.maxZ]}
          castShadow
        >
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color="#333355" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Ambient lighting for terrace */}
      <pointLight
        position={[centerX, 2.5, centerZ]}
        color="#fde68a"
        intensity={0.6}
        distance={8}
        decay={2}
      />

      {/* Label */}
      <Text
        position={[centerX, 0.1, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#fde68a"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        TERRAZA
      </Text>
    </group>
  );
}

/** Entrance area with markers */
function Entrance({ floorDepth }: { floorDepth: number }) {
  const entranceZ = floorDepth / 2;

  return (
    <group position={[0, 0, entranceZ]}>
      {/* Entrance arch left */}
      <mesh position={[-1.2, 1, 0]} castShadow>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.3}
          emissive="#a855f7"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Entrance arch right */}
      <mesh position={[1.2, 1, 0]} castShadow>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.3}
          emissive="#a855f7"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Top bar */}
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[2.55, 0.1, 0.15]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.3}
          emissive="#a855f7"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Neon entrance sign */}
      <Text
        position={[0, 2.3, 0.1]}
        fontSize={0.3}
        color="#a855f7"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        ENTRADA
      </Text>

      {/* Floor entrance accent lights */}
      <pointLight position={[-1, 0.3, 0.3]} color="#a855f7" intensity={0.8} distance={3} decay={2} />
      <pointLight position={[1, 0.3, 0.3]} color="#a855f7" intensity={0.8} distance={3} decay={2} />
    </group>
  );
}

/** Perimeter walls (subtle, semi-transparent) */
function Walls({ size }: { size: [number, number] }) {
  const wallHeight = 2.5;
  const halfW = size[0] / 2;
  const halfD = size[1] / 2;

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, wallHeight / 2, -halfD]}>
        <boxGeometry args={[size[0], wallHeight, 0.1]} />
        <meshStandardMaterial
          color="#0a0a18"
          transparent
          opacity={0.4}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      {/* Left wall */}
      <mesh position={[-halfW, wallHeight / 2, 0]}>
        <boxGeometry args={[0.1, wallHeight, size[1]]} />
        <meshStandardMaterial
          color="#0a0a18"
          transparent
          opacity={0.3}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      {/* Right wall */}
      <mesh position={[halfW, wallHeight / 2, 0]}>
        <boxGeometry args={[0.1, wallHeight, size[1]]} />
        <meshStandardMaterial
          color="#0a0a18"
          transparent
          opacity={0.3}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────
// Main exported component
// ──────────────────────────────────────────────────────────

export default function VenueElements({ config }: VenueElementsProps) {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  return (
    <group>
      {/* Floor */}
      <Floor size={cfg.floorSize} />

      {/* Walls */}
      <Walls size={cfg.floorSize} />

      {/* Stage */}
      {cfg.showStage && <Stage position={cfg.stagePosition} />}

      {/* Dance floor */}
      {cfg.showDanceFloor && <DanceFloor position={cfg.danceFloorPosition} />}

      {/* Bar */}
      {cfg.showBar && <Bar position={cfg.barPosition} />}

      {/* Terrace */}
      {cfg.showTerrace && <Terrace bounds={cfg.terraceBounds} />}

      {/* VIP sectors */}
      {cfg.showVipBoundaries &&
        cfg.vipSectors.map((sector, i) => (
          <VipSector
            key={i}
            name={sector.name}
            color={sector.color}
            bounds={sector.bounds}
          />
        ))}

      {/* Entrance */}
      {cfg.showEntrance && <Entrance floorDepth={cfg.floorSize[1]} />}

      {/* ── Nightclub ambient lighting ── */}
      <ambientLight intensity={0.15} color="#1a1a2e" />

      {/* Main overhead lights */}
      <pointLight position={[0, 6, 0]} color="#a855f7" intensity={0.4} distance={25} decay={2} />
      <pointLight position={[-8, 4, -5]} color="#ec4899" intensity={0.3} distance={15} decay={2} />
      <pointLight position={[8, 4, -5]} color="#6366f1" intensity={0.3} distance={15} decay={2} />
      <pointLight position={[0, 4, 5]} color="#06b6d4" intensity={0.2} distance={15} decay={2} />

      {/* Hemisphere light for general fill */}
      <hemisphereLight
        color="#1a1a3e"
        groundColor="#0a0a14"
        intensity={0.3}
      />
    </group>
  );
}
