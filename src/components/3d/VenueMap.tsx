'use client';

import React, {
  Suspense,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Preload } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

import Table3D, { type Table3DData } from './Table3D';
import TableTooltip from './TableTooltip';
import VenueElements, { type VenueLayoutConfig } from './VenueElements';
import CameraControlsUI, {
  CameraAnimator,
  DEFAULT_CAMERA_PRESETS,
  type CameraPreset,
} from './CameraControls';
import SceneLoader, { SceneLoadingFallback } from './SceneLoader';
import type { TableStatus } from '@/types';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface VenueMapTable {
  id: string;
  number: number;
  label: string;
  status: TableStatus;
  position3D: { x: number; y: number; z: number; rotation: number };
  categoryId: string;
  category?: {
    id: string;
    name: string;
    price: number;
    capacity: number;
    color: string;
    benefits: string[];
  };
}

export interface VenueMapProps {
  /** Array of tables with their data */
  tables: VenueMapTable[];
  /** Callback when a table is selected */
  onTableSelect?: (table: VenueMapTable) => void;
  /** Currently selected table ID */
  selectedTableId?: string | null;
  /** View or edit mode */
  mode?: 'view' | 'edit';
  /** Custom camera presets */
  cameraPresets?: CameraPreset[];
  /** Venue layout configuration */
  venueConfig?: VenueLayoutConfig;
  /** Custom class name for the container */
  className?: string;
  /** Whether to show camera controls */
  showCameraControls?: boolean;
  /** Whether to show the table tooltip */
  showTooltip?: boolean;
  /** Callback for table drag in edit mode */
  onTableDragEnd?: (tableId: string, position: [number, number, number]) => void;
  /** Grid snap for edit mode */
  gridSnap?: boolean;
  /** Grid size for snap */
  gridSize?: number;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function mapTableToTable3DData(table: VenueMapTable): Table3DData {
  return {
    id: table.id,
    number: table.number,
    label: table.label,
    status: table.status,
    categoryColor: table.category?.color || '#6b7280',
    categoryName: table.category?.name || 'General',
    price: table.category?.price || 0,
    capacity: table.category?.capacity || 4,
    benefits: table.category?.benefits || [],
    position: [
      table.position3D.x,
      table.position3D.y,
      table.position3D.z,
    ],
    rotation: table.position3D.rotation,
  };
}

// ──────────────────────────────────────────────────────────
// Inner scene (rendered inside the Canvas)
// ──────────────────────────────────────────────────────────

interface SceneContentProps {
  tables3D: Table3DData[];
  selectedTableId: string | null;
  onTableSelect: (table: Table3DData) => void;
  onTableDismiss: () => void;
  mode: 'view' | 'edit';
  venueConfig?: VenueLayoutConfig;
  showTooltip: boolean;
  onDragEnd?: (tableId: string, position: [number, number, number]) => void;
  gridSnap: boolean;
  gridSize: number;
  activePreset: string | null;
  cameraPresets: CameraPreset[];
  onSceneReady: () => void;
}

function SceneContent({
  tables3D,
  selectedTableId,
  onTableSelect,
  onTableDismiss,
  mode,
  venueConfig,
  showTooltip,
  onDragEnd,
  gridSnap,
  gridSize,
  activePreset,
  cameraPresets,
  onSceneReady,
}: SceneContentProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const selectedTable = useMemo(
    () => tables3D.find((t) => t.id === selectedTableId) || null,
    [tables3D, selectedTableId]
  );

  // Notify parent that scene is ready
  useEffect(() => {
    const timer = setTimeout(onSceneReady, 500);
    return () => clearTimeout(timer);
  }, [onSceneReady]);

  // Store controls reference on the camera for CameraAnimator
  useEffect(() => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object;
      (camera as any).__orbitControls = controlsRef.current;
    }
  });

  const handleBackgroundClick = useCallback(() => {
    onTableDismiss();
  }, [onTableDismiss]);

  return (
    <>
      {/* ── Controls ── */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.1}
        dampingFactor={0.08}
        enableDamping={true}
        target={[0, 0, -2]}
        // Disable orbit during drag in edit mode
        makeDefault
      />

      {/* ── Camera animation ── */}
      <CameraAnimator
        activePreset={activePreset}
        presets={cameraPresets}
      />

      {/* ── Environment / Lighting ── */}
      <Environment preset="night" />

      {/* ── Venue static elements ── */}
      <VenueElements config={venueConfig} />

      {/* ── Click-away handler (invisible plane) ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={handleBackgroundClick}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* ── Tables ── */}
      {tables3D.map((table) => (
        <Table3D
          key={table.id}
          table={table}
          isSelected={table.id === selectedTableId}
          onSelect={onTableSelect}
          mode={mode}
          onDragEnd={onDragEnd}
          gridSnap={gridSnap}
          gridSize={gridSize}
        />
      ))}

      {/* ── Tooltip for selected table ── */}
      {showTooltip && selectedTable && (
        <TableTooltip
          table={selectedTable}
          onSelectTable={onTableSelect}
          onClose={onTableDismiss}
          showSelectButton={mode === 'view'}
        />
      )}

      {/* ── Fog for atmosphere ── */}
      <fog attach="fog" args={['#0a0a1a', 20, 50]} />

      {/* ── Preload all assets ── */}
      <Preload all />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Main VenueMap component
// ──────────────────────────────────────────────────────────

export default function VenueMap({
  tables,
  onTableSelect,
  selectedTableId = null,
  mode = 'view',
  cameraPresets = DEFAULT_CAMERA_PRESETS,
  venueConfig,
  className = '',
  showCameraControls = true,
  showTooltip = true,
  onTableDragEnd,
  gridSnap = true,
  gridSize = 0.5,
}: VenueMapProps) {
  const [activePreset, setActivePreset] = useState<string | null>('full');
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [internalSelected, setInternalSelected] = useState<string | null>(
    selectedTableId
  );

  // Sync external selectedTableId
  useEffect(() => {
    setInternalSelected(selectedTableId);
  }, [selectedTableId]);

  // Convert tables to 3D format
  const tables3D = useMemo(
    () => tables.map(mapTableToTable3DData),
    [tables]
  );

  // Handlers
  const handleTableSelect = useCallback(
    (table3D: Table3DData) => {
      setInternalSelected(table3D.id);
      const originalTable = tables.find((t) => t.id === table3D.id);
      if (originalTable && onTableSelect) {
        onTableSelect(originalTable);
      }
    },
    [tables, onTableSelect]
  );

  const handleTableDismiss = useCallback(() => {
    setInternalSelected(null);
  }, []);

  const handlePresetSelect = useCallback((presetId: string) => {
    setActivePreset(presetId);
  }, []);

  const handleSceneReady = useCallback(() => {
    setIsSceneReady(true);
  }, []);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {/* ── Loading overlay ── */}
      <SceneLoader
        isLoaded={isSceneReady}
        message="Cargando mapa del venue..."
      />

      {/* ── 3D Canvas ── */}
      <Suspense fallback={<SceneLoadingFallback />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{
            position: [0, 18, 14],
            fov: 50,
            near: 0.1,
            far: 200,
          }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{ background: '#0a0a1a' }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
          // Touch events support
          onPointerMissed={() => handleTableDismiss()}
        >
          <SceneContent
            tables3D={tables3D}
            selectedTableId={internalSelected}
            onTableSelect={handleTableSelect}
            onTableDismiss={handleTableDismiss}
            mode={mode}
            venueConfig={venueConfig}
            showTooltip={showTooltip}
            onDragEnd={onTableDragEnd}
            gridSnap={gridSnap}
            gridSize={gridSize}
            activePreset={activePreset}
            cameraPresets={cameraPresets}
            onSceneReady={handleSceneReady}
          />
        </Canvas>
      </Suspense>

      {/* ── Camera controls overlay ── */}
      {showCameraControls && (
        <CameraControlsUI
          presets={cameraPresets}
          activePreset={activePreset}
          onPresetSelect={handlePresetSelect}
        />
      )}

      {/* ── Legend overlay ── */}
      <div className="absolute left-4 top-4 z-10">
        <div className="rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Estado
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              { color: 'bg-green-500', label: 'Disponible' },
              { color: 'bg-yellow-500', label: 'Reservada' },
              { color: 'bg-red-500', label: 'Vendida' },
              { color: 'bg-gray-500', label: 'Bloqueada' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-white/70">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table count info ── */}
      <div className="absolute right-4 top-4 z-10">
        <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-md">
          <p className="text-xs text-white/50">
            <span className="font-semibold text-green-400">
              {tables.filter((t) => t.status === 'available').length}
            </span>
            {' / '}
            <span className="text-white/70">{tables.length}</span>
            {' disponibles'}
          </p>
        </div>
      </div>

      {/* ── Edit mode indicator ── */}
      {mode === 'edit' && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 transform">
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/40 px-4 py-2 backdrop-blur-md">
            <p className="text-xs font-medium text-amber-300">
              Modo edicion -- Arrastra las mesas para reposicionar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
