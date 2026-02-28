'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Ticket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PromoterData {
  _id: string;
  referralToken: string;
  eventId: string;
  userId: any;
  isActive: boolean;
  event?: {
    _id: string;
    title: string;
    date: string;
    status: string;
  };
}

export default function PromoterReferralPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoter, setPromoter] = useState<PromoterData | null>(null);

  useEffect(() => {
    async function validateAndRedirect() {
      if (!token) {
        setError('Token invalido');
        setLoading(false);
        return;
      }

      try {
        // Fetch promoter by referral token
        const res = await fetch(`/api/promoters?referralToken=${token}`);

        if (!res.ok) {
          // Try alternative approach - search through available promoters
          // The API may not support referralToken filter directly
          // In that case, we look for the token in a different way
          setError('No se pudo verificar el link de referido');
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!data.success) {
          setError('Link de referido invalido o expirado');
          setLoading(false);
          return;
        }

        // Find the promoter matching this token
        let foundPromoter: PromoterData | null = null;

        if (data.data?.items) {
          foundPromoter = data.data.items.find(
            (p: any) => p.referralToken === token
          ) || null;
        } else if (data.data?.referralToken === token) {
          foundPromoter = data.data;
        }

        if (!foundPromoter) {
          setError('Link de referido invalido o expirado');
          setLoading(false);
          return;
        }

        if (!foundPromoter.isActive) {
          setError('Este promotor ya no esta activo para este evento');
          setLoading(false);
          return;
        }

        setPromoter(foundPromoter);

        // Store the referral token in sessionStorage for checkout
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('promoterToken', token);
          sessionStorage.setItem('promoterId', foundPromoter._id);
        }

        // Get the event ID
        const eventId = foundPromoter.event?._id || foundPromoter.eventId;

        if (!eventId) {
          setError('No se encontro el evento asociado');
          setLoading(false);
          return;
        }

        // Redirect to event page with ref parameter
        setTimeout(() => {
          router.push(`/events/${eventId}?ref=${token}`);
        }, 2000);
      } catch (err) {
        console.error('Referral link error:', err);
        setError('Error al procesar el link de referido');
        setLoading(false);
      }
    }

    validateAndRedirect();
  }, [token, router]);

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Link Invalido</h1>
          <p className="mb-8 text-white/50">{error}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/events">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white sm:w-auto">
                Ver Eventos
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/5 sm:w-auto"
              >
                Ir al Inicio
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading / redirecting state
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="relative z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center"
          >
            <div className="absolute h-20 w-20 rounded-full border-2 border-transparent border-t-pink-500 border-r-purple-500" />
            <Ticket className="h-8 w-8 text-pink-400" />
          </motion.div>

          {loading ? (
            <>
              <h1 className="mb-2 text-2xl font-bold text-white">
                Verificando Link...
              </h1>
              <p className="text-white/50">Validando tu referido</p>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-white">
                Redirigiendo al Evento
              </h1>
              {promoter?.event && (
                <p className="mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-lg font-bold text-transparent">
                  {promoter.event.title}
                </p>
              )}
              <p className="mb-6 text-white/50">
                Preparando la mejor experiencia para vos...
              </p>
              <div className="flex items-center justify-center gap-2 text-pink-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Redirigiendo</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
