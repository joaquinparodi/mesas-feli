'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-red-600/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/3 h-64 w-64 rounded-full bg-purple-600/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20"
        >
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="mb-2 text-3xl font-bold text-white">
            Algo salio mal
          </h1>
          <p className="mb-2 text-white/50">
            Ocurrio un error inesperado. No te preocupes, podes intentar de nuevo.
          </p>
          {error.digest && (
            <p className="mb-6 text-xs text-white/20">
              Error ID: {error.digest}
            </p>
          )}
        </motion.div>

        {/* Error message (in dev) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-left"
          >
            <p className="text-xs font-mono text-red-400/80 break-all">
              {error.message}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Button
            onClick={reset}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Intentar de Nuevo
          </Button>
          <Link href="/">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/5 sm:w-auto"
            >
              <Home className="mr-2 h-4 w-4" />
              Ir al Inicio
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
