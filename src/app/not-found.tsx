'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 30% 50%, rgba(168, 85, 247, 0.06), transparent 50%)',
              'radial-gradient(circle at 70% 50%, rgba(236, 72, 153, 0.06), transparent 50%)',
              'radial-gradient(circle at 30% 50%, rgba(168, 85, 247, 0.06), transparent 50%)',
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="h-full w-full"
        />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20 - Math.random() * 30, 0],
            x: [0, (Math.random() - 0.5) * 20, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
          className="absolute h-1 w-1 rounded-full bg-purple-400"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
        />
      ))}

      <div className="relative z-10 text-center">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100 }}
          className="relative mb-6"
        >
          <h1
            className="text-[10rem] font-black leading-none md:text-[14rem]"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #ec4899, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.3))',
            }}
          >
            404
          </h1>
          {/* Glow behind the text */}
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="h-48 w-48 rounded-full bg-purple-600/10 blur-3xl" />
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Pagina no encontrada</span>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-white md:text-3xl">
            La fiesta no esta aqui
          </h2>
          <p className="mx-auto mb-8 max-w-md text-white/50">
            Parece que esta pagina se fue a otra fiesta. No te preocupes, te
            ayudamos a encontrar el camino de vuelta.
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link href="/">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow"
            >
              <Home className="mr-2 h-4 w-4" />
              Ir al Inicio
            </Button>
          </Link>
          <Link href="/events">
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver Eventos
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
