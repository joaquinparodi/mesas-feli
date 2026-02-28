'use client';

import React, { useState, useEffect } from 'react';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface SceneLoaderProps {
  /** Whether the 3D scene has finished loading */
  isLoaded?: boolean;
  /** Optional message to display */
  message?: string;
}

// ──────────────────────────────────────────────────────────
// Animated background bars
// ──────────────────────────────────────────────────────────

function EqualizerBars() {
  return (
    <div className="flex items-end gap-1" style={{ height: 40 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="w-1.5 rounded-full"
          style={{
            backgroundColor: i % 2 === 0 ? '#a855f7' : '#ec4899',
            animation: `equalizerBar ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.08}s`,
            height: '100%',
          }}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────

export default function SceneLoader({
  isLoaded = false,
  message = 'Cargando escena 3D...',
}: SceneLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  // Simulate progress (since Three.js loading progress is hard to track precisely)
  useEffect(() => {
    if (isLoaded) {
      setProgress(100);
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }

    let frame: number;
    let current = 0;

    const animate = () => {
      // Slow down as it approaches 90% (waiting for actual load)
      const increment = current < 60 ? 1.5 : current < 80 ? 0.5 : 0.1;
      current = Math.min(current + increment, 90);
      setProgress(current);

      if (current < 90) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isLoaded]);

  if (!visible) return null;

  return (
    <div
      className={`
        absolute inset-0 z-50 flex flex-col items-center justify-center
        bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2a] to-[#0a0a1a]
        transition-opacity duration-500
        ${isLoaded ? 'pointer-events-none opacity-0' : 'opacity-100'}
      `}
    >
      {/* ── Animated background glow effects ── */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
            animation: 'pulseGlow 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -right-1/4 bottom-1/4 h-96 w-96 rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
            animation: 'pulseGlow 4s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo / brand placeholder */}
        <div className="mb-2 text-3xl font-bold tracking-wider">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            MESA
          </span>
          <span className="text-white">VIP</span>
        </div>

        {/* Equalizer animation */}
        <EqualizerBars />

        {/* Message */}
        <p className="text-sm font-medium text-white/60">{message}</p>

        {/* Progress bar */}
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress percentage */}
        <p className="text-xs tabular-nums text-white/40">
          {Math.round(progress)}%
        </p>
      </div>

      {/* ── CSS animations ── */}
      <style jsx>{`
        @keyframes equalizerBar {
          0% {
            transform: scaleY(0.2);
          }
          100% {
            transform: scaleY(1);
          }
        }
        @keyframes pulseGlow {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.25;
          }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Suspense fallback wrapper
// ──────────────────────────────────────────────────────────

export function SceneLoadingFallback() {
  return <SceneLoader isLoaded={false} message="Preparando el mapa 3D..." />;
}
