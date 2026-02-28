import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  TableStatus,
  TablePosition3D,
} from '@/types';

// ──────────────────────────────────────────────────────────
// Types for the layout editor
// ──────────────────────────────────────────────────────────

export interface EditorTable {
  id: string;
  number: number;
  label: string;
  categoryId: string;
  sectorLabel: string;
  status: TableStatus;
  position3D: TablePosition3D;
}

export interface EditorCategory {
  id: string;
  name: string;
  price: number;
  capacity: number;
  color: string;
  benefits: string[];
}

export interface EditorSector {
  id: string;
  name: string;
  color: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

interface HistorySnapshot {
  tables: EditorTable[];
  categories: EditorCategory[];
  sectors: EditorSector[];
}

export type EditorMode = 'edit' | 'preview';

// ──────────────────────────────────────────────────────────
// State interface
// ──────────────────────────────────────────────────────────

interface LayoutEditorState {
  // Data
  tables: EditorTable[];
  categories: EditorCategory[];
  sectors: EditorSector[];

  // UI state
  selectedTableId: string | null;
  selectedCategoryId: string | null;
  selectedSectorId: string | null;
  isDirty: boolean;
  mode: EditorMode;
  gridSnap: boolean;
  gridSize: number;
  isSaving: boolean;
  saveError: string | null;

  // History for undo/redo
  history: HistorySnapshot[];
  historyIndex: number;
  maxHistory: number;

  // ── Table actions ──
  addTable: (categoryId: string) => void;
  removeTable: (tableId: string) => void;
  updateTablePosition: (tableId: string, position: TablePosition3D) => void;
  updateTableProps: (
    tableId: string,
    props: Partial<Pick<EditorTable, 'number' | 'label' | 'categoryId' | 'sectorLabel' | 'status'>>
  ) => void;
  duplicateTable: (tableId: string) => void;

  // ── Category actions ──
  addCategory: (category: Omit<EditorCategory, 'id'>) => void;
  removeCategory: (categoryId: string) => void;
  updateCategory: (categoryId: string, props: Partial<Omit<EditorCategory, 'id'>>) => void;

  // ── Sector actions ──
  addSector: (sector: Omit<EditorSector, 'id'>) => void;
  removeSector: (sectorId: string) => void;
  updateSector: (sectorId: string, props: Partial<Omit<EditorSector, 'id'>>) => void;

  // ── Selection ──
  selectTable: (tableId: string | null) => void;
  selectCategory: (categoryId: string | null) => void;
  selectSector: (sectorId: string | null) => void;
  deselectAll: () => void;

  // ── Mode ──
  setMode: (mode: EditorMode) => void;
  toggleGridSnap: () => void;
  setGridSize: (size: number) => void;

  // ── Persistence ──
  loadLayout: (data: {
    tables: EditorTable[];
    categories: EditorCategory[];
    sectors?: EditorSector[];
  }) => void;
  getSerializedLayout: () => {
    tables: EditorTable[];
    categories: EditorCategory[];
    sectors: EditorSector[];
  };
  markClean: () => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;

  // ── History ──
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

let _idCounter = 0;
function generateId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}_${Date.now()}_${_idCounter}`;
}

function snapToGrid(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

function createSnapshot(state: Pick<LayoutEditorState, 'tables' | 'categories' | 'sectors'>): HistorySnapshot {
  return {
    tables: state.tables.map((t) => ({ ...t, position3D: { ...t.position3D } })),
    categories: state.categories.map((c) => ({ ...c, benefits: [...c.benefits] })),
    sectors: state.sectors.map((s) => ({ ...s, bounds: { ...s.bounds } })),
  };
}

// ──────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────

export const useLayoutEditorStore = create<LayoutEditorState>()(
  devtools(
    (set, get) => ({
      // Initial data
      tables: [],
      categories: [],
      sectors: [],

      // UI state
      selectedTableId: null,
      selectedCategoryId: null,
      selectedSectorId: null,
      isDirty: false,
      mode: 'edit',
      gridSnap: true,
      gridSize: 0.5,
      isSaving: false,
      saveError: null,

      // History
      history: [],
      historyIndex: -1,
      maxHistory: 50,

      // ────────────────────────────────────────────────
      // Table actions
      // ────────────────────────────────────────────────

      addTable: (categoryId: string) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const tableCount = state.tables.length;
        const newTable: EditorTable = {
          id: generateId('table'),
          number: tableCount + 1,
          label: `Mesa ${tableCount + 1}`,
          categoryId,
          sectorLabel: 'General',
          status: 'available',
          position3D: {
            x: snapToGrid(0, state.gridSize, state.gridSnap),
            y: 0,
            z: snapToGrid(0, state.gridSize, state.gridSnap),
            rotation: 0,
          },
        };

        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            tables: [...state.tables, newTable],
            selectedTableId: newTable.id,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'addTable'
        );
      },

      removeTable: (tableId: string) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            tables: state.tables.filter((t) => t.id !== tableId),
            selectedTableId:
              state.selectedTableId === tableId ? null : state.selectedTableId,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'removeTable'
        );
      },

      updateTablePosition: (tableId: string, position: TablePosition3D) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const snappedPosition: TablePosition3D = {
          x: snapToGrid(position.x, state.gridSize, state.gridSnap),
          y: position.y,
          z: snapToGrid(position.z, state.gridSize, state.gridSnap),
          rotation: position.rotation,
        };

        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            tables: state.tables.map((t) =>
              t.id === tableId ? { ...t, position3D: snappedPosition } : t
            ),
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'updateTablePosition'
        );
      },

      updateTableProps: (tableId, props) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            tables: state.tables.map((t) =>
              t.id === tableId ? { ...t, ...props } : t
            ),
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'updateTableProps'
        );
      },

      duplicateTable: (tableId: string) => {
        const state = get();
        const source = state.tables.find((t) => t.id === tableId);
        if (!source) return;

        const snapshot = createSnapshot(state);
        const tableCount = state.tables.length;
        const newTable: EditorTable = {
          ...source,
          id: generateId('table'),
          number: tableCount + 1,
          label: `Mesa ${tableCount + 1}`,
          position3D: {
            ...source.position3D,
            x: source.position3D.x + 1.5,
            z: source.position3D.z + 1.5,
          },
        };

        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            tables: [...state.tables, newTable],
            selectedTableId: newTable.id,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'duplicateTable'
        );
      },

      // ────────────────────────────────────────────────
      // Category actions
      // ────────────────────────────────────────────────

      addCategory: (category) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const newCategory: EditorCategory = {
          ...category,
          id: generateId('cat'),
        };

        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            categories: [...state.categories, newCategory],
            selectedCategoryId: newCategory.id,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'addCategory'
        );
      },

      removeCategory: (categoryId: string) => {
        const state = get();
        const hasAssignedTables = state.tables.some(
          (t) => t.categoryId === categoryId
        );
        if (hasAssignedTables) return; // Prevent removing category with assigned tables

        const snapshot = createSnapshot(state);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            categories: state.categories.filter((c) => c.id !== categoryId),
            selectedCategoryId:
              state.selectedCategoryId === categoryId
                ? null
                : state.selectedCategoryId,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'removeCategory'
        );
      },

      updateCategory: (categoryId, props) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            categories: state.categories.map((c) =>
              c.id === categoryId ? { ...c, ...props } : c
            ),
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'updateCategory'
        );
      },

      // ────────────────────────────────────────────────
      // Sector actions
      // ────────────────────────────────────────────────

      addSector: (sector) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const newSector: EditorSector = {
          ...sector,
          id: generateId('sector'),
        };

        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            sectors: [...state.sectors, newSector],
            selectedSectorId: newSector.id,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'addSector'
        );
      },

      removeSector: (sectorId: string) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            sectors: state.sectors.filter((s) => s.id !== sectorId),
            selectedSectorId:
              state.selectedSectorId === sectorId
                ? null
                : state.selectedSectorId,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'removeSector'
        );
      },

      updateSector: (sectorId, props) => {
        const state = get();
        const snapshot = createSnapshot(state);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > state.maxHistory) newHistory.shift();

        set(
          {
            sectors: state.sectors.map((s) =>
              s.id === sectorId ? { ...s, ...props } : s
            ),
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
          false,
          'updateSector'
        );
      },

      // ────────────────────────────────────────────────
      // Selection
      // ────────────────────────────────────────────────

      selectTable: (tableId) =>
        set({ selectedTableId: tableId }, false, 'selectTable'),

      selectCategory: (categoryId) =>
        set({ selectedCategoryId: categoryId }, false, 'selectCategory'),

      selectSector: (sectorId) =>
        set({ selectedSectorId: sectorId }, false, 'selectSector'),

      deselectAll: () =>
        set(
          {
            selectedTableId: null,
            selectedCategoryId: null,
            selectedSectorId: null,
          },
          false,
          'deselectAll'
        ),

      // ────────────────────────────────────────────────
      // Mode
      // ────────────────────────────────────────────────

      setMode: (mode) => set({ mode }, false, 'setMode'),

      toggleGridSnap: () =>
        set((state) => ({ gridSnap: !state.gridSnap }), false, 'toggleGridSnap'),

      setGridSize: (size) => set({ gridSize: size }, false, 'setGridSize'),

      // ────────────────────────────────────────────────
      // Persistence
      // ────────────────────────────────────────────────

      loadLayout: (data) => {
        const tables = data.tables.map((t) => ({
          ...t,
          position3D: { ...t.position3D },
        }));
        const categories = data.categories.map((c) => ({
          ...c,
          benefits: [...c.benefits],
        }));
        const sectors = (data.sectors || []).map((s) => ({
          ...s,
          bounds: { ...s.bounds },
        }));

        set(
          {
            tables,
            categories,
            sectors,
            selectedTableId: null,
            selectedCategoryId: null,
            selectedSectorId: null,
            isDirty: false,
            history: [],
            historyIndex: -1,
            saveError: null,
          },
          false,
          'loadLayout'
        );
      },

      getSerializedLayout: () => {
        const state = get();
        return {
          tables: state.tables.map((t) => ({
            ...t,
            position3D: { ...t.position3D },
          })),
          categories: state.categories.map((c) => ({
            ...c,
            benefits: [...c.benefits],
          })),
          sectors: state.sectors.map((s) => ({
            ...s,
            bounds: { ...s.bounds },
          })),
        };
      },

      markClean: () => set({ isDirty: false }, false, 'markClean'),

      setSaving: (saving) => set({ isSaving: saving }, false, 'setSaving'),

      setSaveError: (error) =>
        set({ saveError: error, isSaving: false }, false, 'setSaveError'),

      // ────────────────────────────────────────────────
      // History (undo / redo)
      // ────────────────────────────────────────────────

      undo: () => {
        const state = get();
        if (state.historyIndex < 0) return;

        const snapshot = state.history[state.historyIndex];
        if (!snapshot) return;

        // Before undoing, save current state so redo can restore it
        const currentSnapshot = createSnapshot(state);
        const newHistory = [...state.history];

        // If we're at the end of history, push current state for redo
        if (state.historyIndex === newHistory.length - 1) {
          newHistory.push(currentSnapshot);
        } else {
          newHistory[state.historyIndex + 1] = currentSnapshot;
        }

        set(
          {
            tables: snapshot.tables.map((t) => ({ ...t, position3D: { ...t.position3D } })),
            categories: snapshot.categories.map((c) => ({ ...c, benefits: [...c.benefits] })),
            sectors: snapshot.sectors.map((s) => ({ ...s, bounds: { ...s.bounds } })),
            historyIndex: state.historyIndex - 1,
            history: newHistory,
            isDirty: true,
          },
          false,
          'undo'
        );
      },

      redo: () => {
        const state = get();
        const nextIndex = state.historyIndex + 2;
        if (nextIndex >= state.history.length) return;

        const snapshot = state.history[nextIndex];
        if (!snapshot) return;

        set(
          {
            tables: snapshot.tables.map((t) => ({ ...t, position3D: { ...t.position3D } })),
            categories: snapshot.categories.map((c) => ({ ...c, benefits: [...c.benefits] })),
            sectors: snapshot.sectors.map((s) => ({ ...s, bounds: { ...s.bounds } })),
            historyIndex: state.historyIndex + 1,
            isDirty: true,
          },
          false,
          'redo'
        );
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex >= 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex + 2 < state.history.length;
      },
    }),
    { name: 'layout-editor-store' }
  )
);
