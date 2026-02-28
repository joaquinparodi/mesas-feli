'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Download,
  CalendarPlus,
  Share2,
  QrCode,
  Ticket,
  ArrowRight,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

function ConfirmationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const eventId = params.id as string;
  const reservationId = searchParams.get('id');

  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchReservation() {
      if (!reservationId) {
        setError('No se encontro el ID de la reserva');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/reservations/${reservationId}`);
        const json = await res.json();

        if (json.success) {
          setReservation(json.data);
        } else {
          setError(json.error || 'Error cargando la reserva');
        }
      } catch (err) {
        console.error('Error fetching reservation:', err);
        setError('Error de conexion');
      } finally {
        setLoading(false);
      }
    }

    fetchReservation();
  }, [reservationId]);

  const handleDownloadQR = () => {
    if (!reservation?.qrCode) return;

    // Create a data URL for the QR code text content
    const qrText = reservation.qrCode;
    const link = document.createElement('a');
    link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(qrText)}`;
    link.download = `mesavip-qr-${reservationId}.txt`;
    link.click();

    toast({
      title: 'QR descargado',
      description: 'El codigo QR se descargo exitosamente.',
    });
  };

  const handleAddToCalendar = () => {
    if (!reservation) return;

    const event = reservation.eventId || {};
    const startDate = new Date(event.date || Date.now());
    const endDate = new Date(event.endDate || Date.now());

    const formatGoogleDate = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');

    const venue = event.venue;
    const location = venue
      ? `${venue.name || ''} - ${venue.address || ''}`
      : '';

    const url = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(
      event.title || 'Evento MesaVIP'
    )}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(
      endDate
    )}&details=${encodeURIComponent(
      `Mesa reservada: ${reservation.tableId?.label || ''}\nReserva ID: ${reservationId}`
    )}&location=${encodeURIComponent(location)}`;

    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/events/${eventId}`;
    const shareText = `Reserva tu mesa VIP en MesaVIP`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MesaVIP - Reserva VIP',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copiado',
        description: 'El link del evento fue copiado al portapapeles.',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white/60 mb-2">
            {error || 'Reserva no encontrada'}
          </h2>
          <Link href="/events">
            <Button className="mt-4 bg-purple-600 hover:bg-purple-500">
              Ver Eventos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const event = reservation.eventId || {};
  const table = reservation.tableId || {};
  const category = table.categoryId || {};

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="relative mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 neon-glow"
            >
              <CheckCircle className="h-10 w-10 text-green-400" />
            </motion.div>
            {/* Decorative rings */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ delay: 0.3, duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-green-400/30"
            />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Reserva Confirmada
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/50"
          >
            Tu mesa VIP te espera. Presenta el codigo QR en la entrada.
          </motion.p>
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="rounded-2xl border border-white/10 bg-white p-6 mb-4">
            <div className="flex h-48 w-48 items-center justify-center">
              <QrCode className="h-32 w-32 text-[#1a1a2e]" />
            </div>
          </div>
          <p className="text-xs text-white/30 text-center max-w-xs">
            Mostra este codigo QR en la entrada del evento para acceder a tu
            mesa
          </p>
        </motion.div>

        {/* Reservation Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-4">
            Detalles de la Reserva
          </h3>

          <div className="space-y-4">
            {/* Event */}
            <div>
              <p className="text-lg font-bold text-white">{event.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/50">
                {event.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-purple-400" />
                    {new Date(event.date).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                )}
                {event.date && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-pink-400" />
                    {new Date(event.date).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {event.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    {event.venue.name}
                  </span>
                )}
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Table */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40 mb-1">Mesa</p>
                <p className="text-sm font-medium text-white">
                  {table.label || `Mesa ${table.number}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Categoria</p>
                <p className="text-sm font-medium text-white">
                  {category.name || 'General'}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Invitados</p>
                <p className="text-sm font-medium text-white">
                  {reservation.guestCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Monto</p>
                <p className="text-sm font-bold text-purple-400">
                  ${reservation.amount?.toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Estado</span>
              <Badge
                variant="outline"
                className={
                  reservation.status === 'confirmed'
                    ? 'border-green-500/30 text-green-400 bg-green-500/10'
                    : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                }
              >
                {reservation.status === 'confirmed'
                  ? 'Confirmada'
                  : reservation.status === 'pending'
                  ? 'Pendiente de pago'
                  : reservation.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">Metodo de pago</span>
              <span className="text-sm text-white">
                {reservation.paymentMethod === 'mercadopago'
                  ? 'MercadoPago'
                  : 'Efectivo'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">ID Reserva</span>
              <span className="text-xs text-white/30 font-mono">
                {reservationId?.slice(-8)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-xl border border-purple-500/10 bg-purple-500/5 p-5 mb-8"
        >
          <h3 className="text-sm font-semibold text-purple-400 mb-3">
            Instrucciones para la noche del evento
          </h3>
          <ul className="space-y-2 text-sm text-white/50">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">1.</span>
              Llega al venue con tu codigo QR listo en el celular
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">2.</span>
              Muestra el QR al personal de seguridad en la entrada VIP
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">3.</span>
              Te acompanaran a tu mesa reservada
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">4.</span>
              Disfruta de los beneficios incluidos con tu reserva
            </li>
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-8"
        >
          <Button
            variant="outline"
            onClick={handleDownloadQR}
            className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar QR
          </Button>

          <Button
            variant="outline"
            onClick={handleAddToCalendar}
            className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Agregar al Calendario
          </Button>

          <Button
            variant="outline"
            onClick={handleShare}
            className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-400" />
                Copiado
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </>
            )}
          </Button>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col items-center gap-3"
        >
          <Link href="/profile?tab=reservas" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0">
              <Ticket className="mr-2 h-4 w-4" />
              Ver mis reservas
            </Button>
          </Link>

          <Link
            href="/events"
            className="text-sm text-white/40 hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            Ver mas eventos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
