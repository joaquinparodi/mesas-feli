'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Preload } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

import Table3D, { type Table3DData } from './Table3D';
import VenueElements, { type VenueLayoutConfig } from './VenueElements';
import CameraControlsUI, {
  CameraAnimator,
  DEFAULT_CAMERA_PRESETS,
  type CameraPreset,
} from './CameraControls';
import SceneLoader, { SceneLoadingFallback } from './SceneLoader';
import TableTooltip from './TableTooltip';

import {
  useLayoutEditorStore,
  type EditorTable,
  type EditorCategory,
  type EditorSector,
  type EditorMode,
} from '@/store/layout-editor-store';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface LayoutEditorProps {
  /** Initial layout data to load */
  initialData?: {
    tables: EditorTable[];
    categories: EditorCategory[];
    sectors?: EditorSector[];
  };
  /** Save callback -- receives serialized layout */
  onSave?: (data: {
    tables: EditorTable[];
    categories: EditorCategory[];
    sectors: EditorSector[];
  }) => Promise<void>;
  /** Venue layout configuration */
  venueConfig?: VenueLayoutConfig;
  /** Camera presets */
  cameraPresets?: CameraPreset[];
  /** Custom class name */
  className?: string;
}

// ──────────────────────────────────────────────────────────
// Default category presets
// ──────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_PRESETS: Omit<EditorCategory, 'id'>[] = [
  {
    name: 'VIP Gold',
    price: 50000,
    capacity: 6,
    color: '#f59e0b',
    benefits: ['Botella premium incluida', 'Ubicacion preferencial', 'Acceso VIP'],
  },
  {
    name: 'VIP Platinum',
    price: 80000,
    capacity: 8,
    color: '#a78bfa',
    benefits: ['2 Botellas premium', 'Mejor ubicacion', 'Acceso backstage', 'Mesero exclusivo'],
  },
  {
    name: 'Standard',
    price: 25000,
    capacity: 4,
    color: '#06b6d4',
    benefits: ['Ubicacion general', 'Servicio de mesero'],
  },
  {
    name: 'Terraza',
    price: 35000,
    capacity: 6,
    color: '#22c55e',
    benefits: ['Area exterior', 'Vista privilegiada', 'Botella incluida'],
  },
];

// ──────────────────────────────────────────────────────────
// Sidebar panels
// ──────────────────────────────────────────────────────────

/** Categories management panel */
function CategoriesPanel() {
  const {
    categories,
    addCategory,
    removeCategory,
    updateCategory: _updateCategory,
    selectedCategoryId,
    selectCategory,
    tables,
  } = useLayoutEditorStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState({
    name: '',
    price: 0,
    capacity: 4,
    color: '#a855f7',
    benefits: [] as string[],
  });
  const [newBenefit, setNewBenefit] = useState('');

  const handleAddCategory = () => {
    if (!newCat.name.trim()) return;
    addCategory({ ...newCat, benefits: [...newCat.benefits] });
    setNewCat({ name: '', price: 0, capacity: 4, color: '#a855f7', benefits: [] });
    setIsAdding(false);
  };

  const tableCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    tables.forEach((t) => {
      counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
    });
    return counts;
  }, [tables]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Categorias</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-md bg-purple-600/80 px-2 py-1 text-xs text-white hover:bg-purple-600"
        >
          {isAdding ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {/* Add quick presets if no categories */}
      {categories.length === 0 && !isAdding && (
        <div className="space-y-2">
          <p className="text-xs text-white/40">Agrega categorias predefinidas:</p>
          {DEFAULT_CATEGORY_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => addCategory(preset)}
              className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/10"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: preset.color }}
              />
              <span>{preset.name}</span>
              <span className="ml-auto text-white/40">${preset.price.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Add category form */}
      {isAdding && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <input
            type="text"
            placeholder="Nombre"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Precio"
              value={newCat.price || ''}
              onChange={(e) =>
                setNewCat({ ...newCat, price: parseInt(e.target.value) || 0 })
              }
              className="w-1/2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Capacidad"
              value={newCat.capacity || ''}
              onChange={(e) =>
                setNewCat({ ...newCat, capacity: parseInt(e.target.value) || 1 })
              }
              className="w-1/2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50">Color:</label>
            <input
              type="color"
              value={newCat.color}
              onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </div>
          {/* Benefits */}
          <div className="space-y-1">
            <p className="text-xs text-white/50">Beneficios:</p>
            {newCat.benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-xs text-white/60">{b}</span>
                <button
                  onClick={() =>
                    setNewCat({
                      ...newCat,
                      benefits: newCat.benefits.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  x
                </button>
              </div>
            ))}
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Agregar beneficio"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBenefit.trim()) {
                    setNewCat({
                      ...newCat,
                      benefits: [...newCat.benefits, newBenefit.trim()],
                    });
                    setNewBenefit('');
                  }
                }}
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={() => {
                  if (newBenefit.trim()) {
                    setNewCat({
                      ...newCat,
                      benefits: [...newCat.benefits, newBenefit.trim()],
                    });
                    setNewBenefit('');
                  }
                }}
                className="rounded-md bg-white/10 px-2 text-xs text-white hover:bg-white/20"
              >
                +
              </button>
            </div>
          </div>
          <button
            onClick={handleAddCategory}
            disabled={!newCat.name.trim()}
            className="w-full rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-40"
          >
            Guardar Categoria
          </button>
        </div>
      )}

      {/* Category list */}
      <div className="space-y-1.5">
        {categories.map((cat) => {
          const count = tableCountByCategory[cat.id] || 0;
          const isActive = selectedCategoryId === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => selectCategory(isActive ? null : cat.id)}
              className={`
                cursor-pointer rounded-lg border p-2.5 transition-all
                ${
                  isActive
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/8'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1 truncate text-xs font-medium text-white">
                  {cat.name}
                </span>
                <span className="text-xs text-white/40">{count} mesas</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-white/40">
                  ${cat.price.toLocaleString()} - {cat.capacity} pers.
                </span>
                {count === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCategory(cat.id);
                    }}
                    className="text-xs text-red-400/60 hover:text-red-400"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Selected table properties panel */
function TablePropertiesPanel() {
  const {
    tables,
    categories,
    selectedTableId,
    updateTableProps,
    removeTable,
    duplicateTable,
  } = useLayoutEditorStore();

  const table = tables.find((t) => t.id === selectedTableId);
  if (!table) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-xs text-white/30">
          Selecciona una mesa para editar sus propiedades
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">
        Mesa #{table.number}
      </h3>

      {/* Number */}
      <div>
        <label className="mb-1 block text-xs text-white/50">Numero</label>
        <input
          type="number"
          value={table.number}
          onChange={(e) =>
            updateTableProps(table.id, { number: parseInt(e.target.value) || 0 })
          }
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Label */}
      <div>
        <label className="mb-1 block text-xs text-white/50">Etiqueta</label>
        <input
          type="text"
          value={table.label}
          onChange={(e) =>
            updateTableProps(table.id, { label: e.target.value })
          }
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Category */}
      <div>
        <label className="mb-1 block text-xs text-white/50">Categoria</label>
        <select
          value={table.categoryId}
          onChange={(e) =>
            updateTableProps(table.id, { categoryId: e.target.value })
          }
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id} className="bg-gray-900">
              {cat.name} - ${cat.price.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      {/* Sector */}
      <div>
        <label className="mb-1 block text-xs text-white/50">Sector</label>
        <input
          type="text"
          value={table.sectorLabel}
          onChange={(e) =>
            updateTableProps(table.id, { sectorLabel: e.target.value })
          }
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Status */}
      <div>
        <label className="mb-1 block text-xs text-white/50">Estado</label>
        <select
          value={table.status}
          onChange={(e) =>
            updateTableProps(table.id, {
              status: e.target.value as EditorTable['status'],
            })
          }
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="available" className="bg-gray-900">Disponible</option>
          <option value="reserved" className="bg-gray-900">Reservada</option>
          <option value="sold" className="bg-gray-900">Vendida</option>
          <option value="blocked" className="bg-gray-900">Bloqueada</option>
        </select>
      </div>

      {/* Position (read only) */}
      <div>
        <label className="mb-1 block text-xs text-white/50">Posicion</label>
        <p className="text-xs text-white/40">
          X: {table.position3D.x.toFixed(1)} / Z: {table.position3D.z.toFixed(1)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => duplicateTable(table.id)}
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
        >
          Duplicar
        </button>
        <button
          onClick={() => removeTable(table.id)}
          className="flex-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

/** Sectors management panel */
function SectorsPanel() {
  const { sectors, addSector, removeSector, selectedSectorId, selectSector } =
    useLayoutEditorStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newSector, setNewSector] = useState({
    name: '',
    color: '#a855f7',
    bounds: { minX: -3, maxX: 3, minZ: -3, maxZ: 3 },
  });

  const handleAdd = () => {
    if (!newSector.name.trim()) return;
    addSector(newSector);
    setNewSector({
      name: '',
      color: '#a855f7',
      bounds: { minX: -3, maxX: 3, minZ: -3, maxZ: 3 },
    });
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Sectores</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-md bg-purple-600/80 px-2 py-1 text-xs text-white hover:bg-purple-600"
        >
          {isAdding ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {isAdding && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <input
            type="text"
            placeholder="Nombre del sector"
            value={newSector.name}
            onChange={(e) => setNewSector({ ...newSector, name: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50">Color:</label>
            <input
              type="color"
              value={newSector.color}
              onChange={(e) =>
                setNewSector({ ...newSector, color: e.target.value })
              }
              className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </div>
          <p className="text-xs text-white/40">
            Los limites se definen por defecto. Arrastra en la vista 3D para ajustar.
          </p>
          <button
            onClick={handleAdd}
            disabled={!newSector.name.trim()}
            className="w-full rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-40"
          >
            Crear Sector
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {sectors.map((sector) => {
          const isActive = selectedSectorId === sector.id;
          return (
            <div
              key={sector.id}
              onClick={() => selectSector(isActive ? null : sector.id)}
              className={`
                flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all
                ${
                  isActive
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-white/5 bg-white/5 hover:border-white/10'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: sector.color }}
                />
                <span className="text-xs text-white">{sector.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSector(sector.id);
                }}
                className="text-xs text-red-400/60 hover:text-red-400"
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Editor scene (inside Canvas)
// ──────────────────────────────────────────────────────────

interface EditorSceneProps {
  tables3D: Table3DData[];
  selectedTableId: string | null;
  mode: EditorMode;
  gridSnap: boolean;
  gridSize: number;
  onTableSelect: (table: Table3DData) => void;
  onTableDismiss: () => void;
  onDragEnd: (tableId: string, position: [number, number, number]) => void;
  venueConfig?: VenueLayoutConfig;
  activePreset: string | null;
  cameraPresets: CameraPreset[];
  onSceneReady: () => void;
}

function EditorScene({
  tables3D,
  selectedTableId,
  mode,
  gridSnap,
  gridSize,
  onTableSelect,
  onTableDismiss,
  onDragEnd,
  venueConfig,
  activePreset,
  cameraPresets,
  onSceneReady,
}: EditorSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const selectedTable = useMemo(
    () => tables3D.find((t) => t.id === selectedTableId) || null,
    [tables3D, selectedTableId]
  );

  useEffect(() => {
    const timer = setTimeout(onSceneReady, 500);
    return () => clearTimeout(timer);
  }, [onSceneReady]);

  useEffect(() => {
    if (controlsRef.current) {
      (controlsRef.current.object as any).__orbitControls = controlsRef.current;
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.1}
        dampingFactor={0.08}
        enableDamping
        target={[0, 0, -2]}
        makeDefault
      />

      <CameraAnimator
        activePreset={activePreset}
        presets={cameraPresets}
      />

      <Environment preset="night" />
      <VenueElements config={venueConfig} />

      {/* Grid helper visible in edit mode */}
      {mode === 'edit' && gridSnap && (
        <gridHelper
          args={[30, 30 / gridSize, '#2a2a4a', '#1a1a3a']}
          position={[0, 0.002, 0]}
        />
      )}

      {/* Click-away handler */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={onTableDismiss}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Tables */}
      {tables3D.map((table) => (
        <Table3D
          key={table.id}
          table={table}
          isSelected={table.id === selectedTableId}
          onSelect={onTableSelect}
          mode={mode === 'edit' ? 'edit' : 'view'}
          onDragEnd={onDragEnd}
          gridSnap={gridSnap}
          gridSize={gridSize}
        />
      ))}

      {/* Tooltip in preview mode */}
      {mode === 'preview' && selectedTable && (
        <TableTooltip
          table={selectedTable}
          onClose={onTableDismiss}
          showSelectButton={false}
        />
      )}

      <fog attach="fog" args={['#0a0a1a', 20, 50]} />
      <Preload all />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Main LayoutEditor component
// ──────────────────────────────────────────────────────────

export default function LayoutEditor({
  initialData,
  onSave,
  venueConfig,
  cameraPresets = DEFAULT_CAMERA_PRESETS,
  className = '',
}: LayoutEditorProps) {
  const [activePreset, setActivePreset] = useState<string | null>('full');
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'categories' | 'tables' | 'sectors'>('categories');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Store ──
  const {
    tables,
    categories,
    sectors: _sectors,
    selectedTableId,
    mode,
    isDirty,
    gridSnap,
    gridSize,
    isSaving,
    saveError,
    loadLayout,
    getSerializedLayout,
    markClean,
    setSaving,
    setSaveError,
    selectTable,
    deselectAll,
    setMode,
    toggleGridSnap,
    setGridSize,
    addTable,
    updateTablePosition,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useLayoutEditorStore();

  // ── Load initial data ──
  useEffect(() => {
    if (initialData) {
      loadLayout(initialData);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z = undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z = redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Ctrl+Y / Cmd+Y = redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      // Ctrl+S / Cmd+S = save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Escape = deselect
      if (e.key === 'Escape') {
        deselectAll();
      }
      // Delete = remove selected table
      if (e.key === 'Delete' && selectedTableId) {
        useLayoutEditorStore.getState().removeTable(selectedTableId);
      }
      // G = toggle grid
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
        toggleGridSnap();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedTableId, undo, redo, deselectAll, toggleGridSnap]);

  // ── Convert store tables to Table3DData ──
  const tables3D = useMemo<Table3DData[]>(() => {
    return tables.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return {
        id: t.id,
        number: t.number,
        label: t.label,
        status: t.status,
        categoryColor: cat?.color || '#6b7280',
        categoryName: cat?.name || 'Sin categoria',
        price: cat?.price || 0,
        capacity: cat?.capacity || 4,
        benefits: cat?.benefits || [],
        position: [t.position3D.x, t.position3D.y, t.position3D.z],
        rotation: t.position3D.rotation,
      };
    });
  }, [tables, categories]);

  // ── Handlers ──
  const handleTableSelect = useCallback(
    (table3D: Table3DData) => {
      selectTable(table3D.id);
      setSidebarTab('tables');
    },
    [selectTable]
  );

  const handleTableDismiss = useCallback(() => {
    deselectAll();
  }, [deselectAll]);

  const handleDragEnd = useCallback(
    (tableId: string, position: [number, number, number]) => {
      updateTablePosition(tableId, {
        x: position[0],
        y: position[1],
        z: position[2],
        rotation: 0,
      });
    },
    [updateTablePosition]
  );

  const handleAddTable = useCallback(() => {
    if (categories.length === 0) {
      alert('Primero crea al menos una categoria.');
      return;
    }
    const categoryId = categories[0].id;
    addTable(categoryId);
  }, [categories, addTable]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const data = getSerializedLayout();
      await onSave(data);
      markClean();
    } catch (err: any) {
      setSaveError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [onSave, getSerializedLayout, markClean, setSaving, setSaveError]);

  const handleSceneReady = useCallback(() => {
    setIsSceneReady(true);
  }, []);

  return (
    <div className={`relative flex h-full w-full overflow-hidden bg-[#0a0a1a] ${className}`}>
      {/* ══════════════════════════════════════════════
          SIDEBAR
          ══════════════════════════════════════════════ */}
      <div
        className={`
          relative z-20 flex flex-col border-r border-white/10 bg-[#0d0d1f]/95
          backdrop-blur-xl transition-all duration-300
          ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <h2 className="text-sm font-bold text-white">Editor de Layout</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-white/10 p-2">
          <button
            onClick={() => setMode('edit')}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === 'edit'
                ? 'bg-purple-600 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Editar
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === 'preview'
                ? 'bg-purple-600 text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Vista Previa
          </button>
        </div>

        {/* Tools bar */}
        <div className="flex items-center gap-1 border-b border-white/10 p-2">
          {/* Undo */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            title="Deshacer (Ctrl+Z)"
            className="rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          {/* Redo */}
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="Rehacer (Ctrl+Shift+Z)"
            className="rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>

          <div className="mx-1 h-4 w-px bg-white/10" />

          {/* Grid snap toggle */}
          <button
            onClick={toggleGridSnap}
            title={`Grilla: ${gridSnap ? 'ON' : 'OFF'} (G)`}
            className={`rounded-md p-1.5 transition ${
              gridSnap
                ? 'bg-purple-600/50 text-purple-300'
                : 'text-white/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>

          {/* Grid size selector */}
          {gridSnap && (
            <select
              value={gridSize}
              onChange={(e) => setGridSize(parseFloat(e.target.value))}
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="0.25" className="bg-gray-900">0.25</option>
              <option value="0.5" className="bg-gray-900">0.5</option>
              <option value="1" className="bg-gray-900">1.0</option>
              <option value="2" className="bg-gray-900">2.0</option>
            </select>
          )}

          <div className="flex-1" />

          {/* Add table button */}
          <button
            onClick={handleAddTable}
            disabled={categories.length === 0}
            title="Agregar mesa"
            className="rounded-md bg-green-600/80 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-green-600 disabled:opacity-30"
          >
            + Mesa
          </button>
        </div>

        {/* Sidebar tabs */}
        <div className="flex border-b border-white/10">
          {(['categories', 'tables', 'sectors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 border-b-2 px-3 py-2 text-xs font-medium transition ${
                sidebarTab === tab
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'categories'
                ? 'Categorias'
                : tab === 'tables'
                  ? 'Mesa Sel.'
                  : 'Sectores'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-3">
          {sidebarTab === 'categories' && <CategoriesPanel />}
          {sidebarTab === 'tables' && <TablePropertiesPanel />}
          {sidebarTab === 'sectors' && <SectorsPanel />}
        </div>

        {/* Footer: Save button */}
        <div className="border-t border-white/10 p-3">
          {saveError && (
            <p className="mb-2 text-xs text-red-400">{saveError}</p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-white/30">
                {tables.length} mesas{' '}
                {isDirty && (
                  <span className="text-amber-400">- Sin guardar</span>
                )}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving || !onSave}
              className={`
                rounded-md px-4 py-2 text-xs font-semibold transition
                ${
                  isDirty && !isSaving
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500'
                    : 'bg-white/5 text-white/30'
                }
              `}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Sidebar toggle (when collapsed)
          ══════════════════════════════════════════════ */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-2 top-2 z-20 rounded-lg border border-white/10 bg-black/70 p-2 text-white/60 backdrop-blur-md transition hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* ══════════════════════════════════════════════
          3D CANVAS AREA
          ══════════════════════════════════════════════ */}
      <div className="relative flex-1">
        {/* Loading overlay */}
        <SceneLoader
          isLoaded={isSceneReady}
          message="Cargando editor 3D..."
        />

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
            onPointerMissed={handleTableDismiss}
          >
            <EditorScene
              tables3D={tables3D}
              selectedTableId={selectedTableId}
              mode={mode}
              gridSnap={gridSnap}
              gridSize={gridSize}
              onTableSelect={handleTableSelect}
              onTableDismiss={handleTableDismiss}
              onDragEnd={handleDragEnd}
              venueConfig={venueConfig}
              activePreset={activePreset}
              cameraPresets={cameraPresets}
              onSceneReady={handleSceneReady}
            />
          </Canvas>
        </Suspense>

        {/* Camera controls */}
        <CameraControlsUI
          presets={cameraPresets}
          activePreset={activePreset}
          onPresetSelect={setActivePreset}
        />

        {/* Mode indicator */}
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 transform">
          <div
            className={`rounded-lg border px-4 py-2 backdrop-blur-md ${
              mode === 'edit'
                ? 'border-amber-500/30 bg-amber-900/40'
                : 'border-green-500/30 bg-green-900/40'
            }`}
          >
            <p
              className={`text-xs font-medium ${
                mode === 'edit' ? 'text-amber-300' : 'text-green-300'
              }`}
            >
              {mode === 'edit'
                ? 'Modo edicion -- Arrastra mesas para reposicionar'
                : 'Vista previa -- Asi lo veran los clientes'}
            </p>
          </div>
        </div>

        {/* Table count */}
        <div className="absolute right-4 top-4 z-10">
          <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-md">
            <p className="text-xs text-white/50">
              <span className="font-semibold text-white">{tables.length}</span> mesas
            </p>
          </div>
        </div>

        {/* Keyboard shortcuts help */}
        <div className="absolute bottom-16 right-4 z-10">
          <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] text-white/30 leading-relaxed">
              Ctrl+Z Deshacer | Ctrl+Shift+Z Rehacer
              <br />
              Ctrl+S Guardar | Del Eliminar | G Grilla | Esc Deseleccionar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
