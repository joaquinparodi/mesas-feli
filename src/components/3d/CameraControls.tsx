'use client';

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface CameraPreset {
  id: string;
  label: string;
  icon: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface CameraControlsInnerProps {
  activePreset: string | null;
  onAnimationComplete?: () => void;
  presets: CameraPreset[];
}

export interface CameraControlsUIProps {
  presets: CameraPreset[];
  activePreset: string | null;
  onPresetSelect: (presetId: string) => void;
}

// ──────────────────────────────────────────────────────────
// Default presets
// ──────────────────────────────────────────────────────────

export const DEFAULT_CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'full',
    label: 'Vista General',
    icon: 'eye',
    position: [0, 18, 14],
    target: [0, 0, -2],
  },
  {
    id: 'vip',
    label: 'Zona VIP',
    icon: 'crown',
    position: [0, 8, 5],
    target: [0, 0, 1],
  },
  {
    id: 'bar',
    label: 'Barra',
    icon: 'glass',
    position: [-8, 5, 3],
    target: [-12, 0, 0],
  },
  {
    id: 'terrace',
    label: 'Terraza',
    icon: 'outdoor',
    position: [12, 6, 12],
    target: [11, 0, 7],
  },
  {
    id: 'stage',
    label: 'Escenario',
    icon: 'music',
    position: [0, 5, -3],
    target: [0, 0, -8],
  },
];

// ──────────────────────────────────────────────────────────
// Inner component (renders INSIDE the Canvas)
// Smoothly animates the camera to the active preset
// ──────────────────────────────────────────────────────────

export function CameraAnimator({
  activePreset,
  onAnimationComplete,
  presets,
}: CameraControlsInnerProps) {
  const { camera } = useThree();
  const isAnimating = useRef(false);
  const progress = useRef(0);
  const startPosition = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());
  const currentTarget = useRef(new THREE.Vector3(0, 0, -2));

  // We need to store the OrbitControls target reference
  // It will be set from the parent component
  const orbitControlsRef = useRef<any>(null);

  // Get orbit controls from the scene userData
  useEffect(() => {
    // Small delay to ensure controls are mounted
    const timer = setTimeout(() => {
      const controls = (camera as any).__orbitControls;
      if (controls) {
        orbitControlsRef.current = controls;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [camera]);

  useEffect(() => {
    if (!activePreset) return;

    const preset = presets.find((p) => p.id === activePreset);
    if (!preset) return;

    startPosition.current.copy(camera.position);
    endPosition.current.set(...preset.position);

    // Try to get current orbit target
    if (orbitControlsRef.current) {
      startTarget.current.copy(orbitControlsRef.current.target);
    } else {
      startTarget.current.copy(currentTarget.current);
    }
    endTarget.current.set(...preset.target);

    progress.current = 0;
    isAnimating.current = true;
  }, [activePreset, presets, camera]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    // Smooth ease-in-out animation
    progress.current = Math.min(progress.current + delta * 1.2, 1);
    const t = easeInOutCubic(progress.current);

    // Interpolate camera position
    camera.position.lerpVectors(startPosition.current, endPosition.current, t);

    // Interpolate look-at target
    currentTarget.current.lerpVectors(startTarget.current, endTarget.current, t);

    // Update orbit controls target if available
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(currentTarget.current);
      orbitControlsRef.current.update();
    } else {
      camera.lookAt(currentTarget.current);
    }

    if (progress.current >= 1) {
      isAnimating.current = false;
      onAnimationComplete?.();
    }
  });

  return null;
}

// ──────────────────────────────────────────────────────────
// Easing function
// ──────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ──────────────────────────────────────────────────────────
// Preset icons (inline SVG components)
// ──────────────────────────────────────────────────────────

function PresetIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'eye':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'crown':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          <path d="M3 20h18" />
        </svg>
      );
    case 'glass':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2h8l-2 10H10L8 2z" />
          <path d="M12 12v8" />
          <path d="M8 22h8" />
        </svg>
      );
    case 'outdoor':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );
    case 'music':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

// ──────────────────────────────────────────────────────────
// UI component (renders OUTSIDE the Canvas as an overlay)
// ──────────────────────────────────────────────────────────

export default function CameraControlsUI({
  presets,
  activePreset,
  onPresetSelect,
}: CameraControlsUIProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 transform">
      <div
        className="
          flex items-center gap-1 rounded-xl border border-white/10
          bg-black/70 p-1.5 shadow-2xl backdrop-blur-xl
        "
      >
        {presets.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onPresetSelect(preset.id)}
              className={`
                flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-purple-600/80 text-white shadow-lg shadow-purple-500/20'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }
              `}
              title={preset.label}
            >
              <PresetIcon icon={preset.icon} />
              <span className="hidden sm:inline">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
