'use client';

import React from 'react';
import { Html } from '@react-three/drei';
import type { Table3DData } from './Table3D';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface TableTooltipProps {
  table: Table3DData;
  onSelectTable?: (table: Table3DData) => void;
  onClose?: () => void;
  showSelectButton?: boolean;
}

// ──────────────────────────────────────────────────────────
// Status display helpers
// ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  sold: 'Vendida',
  blocked: 'Bloqueada',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  reserved: 'bg-yellow-500',
  sold: 'bg-red-500',
  blocked: 'bg-gray-500',
};

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function TableTooltip({
  table,
  onSelectTable,
  onClose,
  showSelectButton = true,
}: TableTooltipProps) {
  const canSelect = table.status === 'available';

  return (
    <Html
      position={[table.position[0], 1.4, table.position[2]]}
      center
      distanceFactor={8}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'auto',
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      <div
        className="
          w-[260px] rounded-xl border border-white/10
          bg-black/80 p-4 shadow-2xl
          backdrop-blur-xl
        "
        style={{
          fontFamily: 'system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: table.categoryColor }}
            >
              {table.number}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Mesa {table.number}
              </h3>
              <p className="text-xs text-white/60">{table.categoryName}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="
                flex h-6 w-6 items-center justify-center rounded-full
                text-white/40 transition-colors hover:bg-white/10 hover:text-white
              "
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M9 3L3 9M3 3l6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* ── Status badge ── */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_COLORS[table.status] || 'bg-gray-500'}`}
          />
          <span className="text-xs font-medium text-white/70">
            {STATUS_LABELS[table.status] || table.status}
          </span>
        </div>

        {/* ── Details ── */}
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Precio</span>
            <span className="text-sm font-semibold text-white">
              ${table.price.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Capacidad</span>
            <span className="text-sm text-white">
              {table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}
            </span>
          </div>
        </div>

        {/* ── Benefits ── */}
        {table.benefits.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-white/50">
              Beneficios
            </p>
            <ul className="space-y-1">
              {table.benefits.map((benefit, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-white/70"
                >
                  <span
                    className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: table.categoryColor }}
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Select button ── */}
        {showSelectButton && (
          <button
            disabled={!canSelect}
            onClick={() => canSelect && onSelectTable?.(table)}
            className={`
              w-full rounded-lg px-4 py-2.5 text-sm font-semibold
              transition-all duration-200
              ${
                canSelect
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-white/5 text-white/30'
              }
            `}
          >
            {canSelect
              ? 'Seleccionar Mesa'
              : STATUS_LABELS[table.status] || 'No disponible'}
          </button>
        )}
      </div>
    </Html>
  );
}
