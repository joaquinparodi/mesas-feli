'use client';

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { TableStatus } from '@/types';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface Table3DData {
  id: string;
  number: number;
  label: string;
  status: TableStatus;
  categoryColor: string;
  categoryName: string;
  price: number;
  capacity: number;
  benefits: string[];
  position: [number, number, number];
  rotation: number;
}

export interface Table3DProps {
  table: Table3DData;
  isSelected: boolean;
  onSelect: (table: Table3DData) => void;
  mode: 'view' | 'edit';
  onDragEnd?: (tableId: string, position: [number, number, number]) => void;
  gridSnap?: boolean;
  gridSize?: number;
}

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TableStatus, string> = {
  available: '#22c55e',
  reserved: '#eab308',
  sold: '#ef4444',
  blocked: '#6b7280',
};

const TABLE_RADIUS = 0.45;
const TABLE_HEIGHT = 0.12;
const TABLE_LEG_RADIUS = 0.04;
const TABLE_LEG_HEIGHT = 0.5;
const CHAIR_RADIUS = 0.12;
const HOVER_LIFT = 0.15;
const SELECTED_RING_RADIUS = 0.65;

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function Table3D({
  table,
  isSelected,
  onSelect,
  mode,
  onDragEnd,
  gridSnap = true,
  gridSize = 0.5,
}: Table3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  // Drag state refs (to avoid re-renders during drag)
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const dragIntersection = useRef(new THREE.Vector3());

  // ── Derived values ──
  const statusColor = STATUS_COLORS[table.status];
  const categoryColor = useMemo(() => new THREE.Color(table.categoryColor), [table.categoryColor]);
  const isInteractive = table.status !== 'blocked' || mode === 'edit';

  // ── Chair positions around the table ──
  const chairPositions = useMemo(() => {
    const count = Math.min(table.capacity, 8);
    const positions: [number, number, number][] = [];
    const chairDistance = TABLE_RADIUS + 0.28;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + table.rotation;
      positions.push([
        Math.cos(angle) * chairDistance,
        0.18,
        Math.sin(angle) * chairDistance,
      ]);
    }
    return positions;
  }, [table.capacity, table.rotation]);

  // ── Cursor management ──
  useEffect(() => {
    if (hovered && isInteractive) {
      gl.domElement.style.cursor = mode === 'edit' ? 'grab' : 'pointer';
    }
    return () => {
      gl.domElement.style.cursor = 'auto';
    };
  }, [hovered, isInteractive, mode, gl.domElement]);

  // ── Animations ──
  useFrame((state) => {
    if (!groupRef.current) return;

    // Hover lift animation
    const targetY = hovered && isInteractive ? HOVER_LIFT : 0;
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY,
      0.1
    );

    // Hover scale animation
    const targetScale = hovered && isInteractive ? 1.05 : 1.0;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1)
    );

    // Selected ring pulse
    if (ringRef.current && isSelected) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.08 + 1.0;
      ringRef.current.scale.setScalar(pulse);
      (ringRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }

    // Glow intensity
    if (glowRef.current) {
      const baseIntensity = isSelected ? 1.2 : hovered ? 0.8 : 0.3;
      glowRef.current.intensity = THREE.MathUtils.lerp(
        glowRef.current.intensity,
        baseIntensity,
        0.1
      );
    }
  });

  // ── Event handlers ──
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (mode === 'edit' && isInteractive) {
        setIsDragging(true);
        gl.domElement.style.cursor = 'grabbing';
        // Calculate drag offset
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
          (e.nativeEvent.offsetX / gl.domElement.clientWidth) * 2 - 1,
          -(e.nativeEvent.offsetY / gl.domElement.clientHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current);
        dragOffset.current.copy(dragIntersection.current).sub(
          new THREE.Vector3(table.position[0], 0, table.position[2])
        );
        (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);
      }
    },
    [mode, isInteractive, camera, gl, table.position]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging || mode !== 'edit' || !groupRef.current) return;
      e.stopPropagation();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (e.nativeEvent.offsetX / gl.domElement.clientWidth) * 2 - 1,
        -(e.nativeEvent.offsetY / gl.domElement.clientHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current);
      let newX = dragIntersection.current.x - dragOffset.current.x;
      let newZ = dragIntersection.current.z - dragOffset.current.z;

      if (gridSnap && gridSize > 0) {
        newX = Math.round(newX / gridSize) * gridSize;
        newZ = Math.round(newZ / gridSize) * gridSize;
      }

      // Update group position visually during drag
      groupRef.current.parent!.position.set(newX, 0, newZ);
    },
    [isDragging, mode, camera, gl, gridSnap, gridSize]
  );

  const handlePointerUp = useCallback(
    (_e: ThreeEvent<PointerEvent>) => {
      if (isDragging && mode === 'edit') {
        setIsDragging(false);
        gl.domElement.style.cursor = hovered ? 'grab' : 'auto';

        if (groupRef.current?.parent) {
          const parentPos = groupRef.current.parent.position;
          onDragEnd?.(table.id, [parentPos.x, 0, parentPos.z]);
        }
      }

      if (!isDragging && isInteractive) {
        onSelect(table);
      }
    },
    [isDragging, mode, isInteractive, gl, hovered, onDragEnd, onSelect, table]
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (mode === 'view' && isInteractive) {
        onSelect(table);
      }
    },
    [mode, isInteractive, onSelect, table]
  );

  return (
    <group position={[table.position[0], 0, table.position[2]]}>
      <group
        ref={groupRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
      >
        {/* ── Table top (cylinder) ── */}
        <mesh position={[0, TABLE_LEG_HEIGHT + TABLE_HEIGHT / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, TABLE_HEIGHT, 32]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={categoryColor}
            emissiveIntensity={hovered ? 0.4 : 0.15}
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>

        {/* ── Table leg (center) ── */}
        <mesh position={[0, TABLE_LEG_HEIGHT / 2, 0]} castShadow>
          <cylinderGeometry args={[TABLE_LEG_RADIUS, TABLE_LEG_RADIUS * 1.5, TABLE_LEG_HEIGHT, 8]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* ── Table base ── */}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.04, 16]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* ── Chairs ── */}
        {chairPositions.map((pos, i) => (
          <group key={i} position={pos}>
            {/* Chair seat */}
            <mesh castShadow>
              <sphereGeometry args={[CHAIR_RADIUS, 12, 12]} />
              <meshStandardMaterial
                color="#2d2d44"
                emissive={categoryColor}
                emissiveIntensity={0.05}
                metalness={0.2}
                roughness={0.7}
              />
            </mesh>
            {/* Chair back */}
            <mesh position={[0, 0.12, 0]} castShadow>
              <boxGeometry args={[0.15, 0.16, 0.04]} />
              <meshStandardMaterial color="#2d2d44" metalness={0.2} roughness={0.7} />
            </mesh>
          </group>
        ))}

        {/* ── Table number label ── */}
        <Text
          position={[0, TABLE_LEG_HEIGHT + TABLE_HEIGHT + 0.35, 0]}
          fontSize={0.22}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font={undefined}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {String(table.number)}
        </Text>

        {/* ── Category accent label ── */}
        <Text
          position={[0, TABLE_LEG_HEIGHT + TABLE_HEIGHT + 0.15, 0]}
          fontSize={0.1}
          color={table.categoryColor}
          anchorX="center"
          anchorY="middle"
          font={undefined}
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {table.categoryName}
        </Text>

        {/* ── Glow light ── */}
        <pointLight
          ref={glowRef}
          position={[0, TABLE_LEG_HEIGHT + 0.3, 0]}
          color={table.categoryColor}
          intensity={0.3}
          distance={2.5}
          decay={2}
        />

        {/* ── Selected ring ── */}
        {isSelected && (
          <mesh
            ref={ringRef}
            position={[0, 0.05, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[SELECTED_RING_RADIUS - 0.05, SELECTED_RING_RADIUS, 64]} />
            <meshStandardMaterial
              color={table.categoryColor}
              emissive={table.categoryColor}
              emissiveIntensity={1.5}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* ── Status indicator dot ── */}
        <mesh position={[TABLE_RADIUS - 0.1, TABLE_LEG_HEIGHT + TABLE_HEIGHT + 0.05, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={2}
          />
        </mesh>
      </group>
    </group>
  );
}
