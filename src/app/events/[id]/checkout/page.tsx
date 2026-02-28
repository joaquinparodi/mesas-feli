'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Users,
  Sparkles,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useReservationStore } from '@/store/reservation-store';
import CountdownTimer from '@/components/events/CountdownTimer';

// ─── Zod schema ─────────────────────────────

const checkoutSchema = z.object({
  guestCount: z
    .number({ message: 'Ingresa la cantidad de invitados' })
    .int()
    .min(1, 'Minimo 1 invitado')
    .max(50, 'Maximo 50 invitados'),
  guestNames: z.string().optional(),
  notes: z.string().max(1000, 'Maximo 1000 caracteres').optional(),
  paymentMethod: z.enum(['mercadopago', 'cash'], {
    message: 'Selecciona un metodo de pago',
  }),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'Debes aceptar los terminos'),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { toast } = useToast();
  const eventId = params.id as string;

  const {
    selectedTable,
    selectedEvent,
    isLoading,
    error: storeError,
    setLoading,
    setError,
    setReservationId,
    setPaymentUrl,
    reset,
  } = useReservationStore();

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'cash'>(
    'mercadopago'
  );

  // Calculate hold expiry (15 minutes from now)
  const [holdExpiry] = useState(() => {
    return new Date(Date.now() + 15 * 60 * 1000).toISOString();
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push(`/login?callbackUrl=/events/${eventId}/checkout`);
    }
  }, [authStatus, router, eventId]);

  // Redirect if no table selected
  useEffect(() => {
    if (authStatus === 'authenticated' && !selectedTable) {
      router.push(`/events/${eventId}`);
    }
  }, [authStatus, selectedTable, router, eventId]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    defaultValues: {
      guestCount: 1,
      guestNames: '',
      notes: '',
      paymentMethod: 'mercadopago',
      acceptTerms: false,
    },
  });

  const watchedGuestCount = watch('guestCount');

  // Handle timer expiry
  const handleTimerExpire = useCallback(() => {
    toast({
      title: 'Tiempo agotado',
      description:
        'Tu reserva ha expirado. La mesa fue liberada. Podes seleccionar otra mesa.',
      variant: 'destructive',
    });
    reset();
    router.push(`/events/${eventId}`);
  }, [toast, reset, router, eventId]);

  // Submit handler
  const onSubmit = async (data: CheckoutFormValues) => {
    if (!selectedTable || !selectedEvent) return;

    setSubmitting(true);
    setError(null);

    try {
      const promoterToken =
        sessionStorage.getItem(`promoter_${eventId}`) || undefined;

      const guestNames = data.guestNames
        ? data.guestNames
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean)
        : [];

      const body = {
        eventId: selectedEvent.id,
        tableId: selectedTable.id,
        guestCount: data.guestCount,
        guestNames,
        notes: data.notes || '',
        paymentMethod: data.paymentMethod,
        promoterToken,
      };

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Error al crear la reserva');
      }

      const reservationData = json.data;
      setReservationId(reservationData.reservation._id);

      if (data.paymentMethod === 'mercadopago' && reservationData.paymentUrl) {
        setPaymentUrl(reservationData.paymentUrl);
        // Redirect to MercadoPago
        window.location.href = reservationData.paymentUrl;
      } else {
        // Cash payment - go to confirmation
        toast({
          title: 'Reserva confirmada',
          description: 'Tu mesa ha sido reservada exitosamente.',
        });
        router.push(`/events/${eventId}/confirmation?id=${reservationData.reservation._id}`);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo completar la reserva',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (authStatus === 'loading' || !selectedTable || !selectedEvent) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const tableCategory = selectedTable.category;
  const tablePrice = tableCategory?.price || 0;
  const serviceFee = Math.round(tablePrice * 0.05);
  const totalPrice = tablePrice + serviceFee;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link href={`/events/${eventId}`} className="inline-block mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al evento
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-white mb-2 sm:text-3xl">
            Checkout
          </h1>
          <p className="text-white/50 mb-6">
            Completa tu reserva para{' '}
            <span className="text-purple-400">{selectedEvent.title}</span>
          </p>

          {/* Countdown Timer */}
          <CountdownTimer
            expiresAt={holdExpiry}
            onExpire={handleTimerExpire}
            className="mb-6"
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Form Section */}
            <div className="lg:col-span-3">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                id="checkout-form"
              >
                {/* Table Summary */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-3">
                    Mesa Seleccionada
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tableCategory && (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: tableCategory.color + '20',
                          }}
                        >
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: tableCategory.color }}
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">
                          Mesa {selectedTable.number}
                        </p>
                        <p className="text-sm text-white/50">
                          {tableCategory?.name || 'General'} - Hasta{' '}
                          {tableCategory?.capacity || 4} personas
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-green-500/30 text-green-400 bg-green-500/10"
                    >
                      Reservada
                    </Badge>
                  </div>

                  {tableCategory?.benefits &&
                    tableCategory.benefits.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {tableCategory.benefits.map((b, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300"
                          >
                            <Sparkles className="h-3 w-3" />
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                {/* Guest Count */}
                <div className="space-y-2">
                  <Label
                    htmlFor="guestCount"
                    className="text-white/70 flex items-center gap-2"
                  >
                    <Users className="h-4 w-4 text-purple-400" />
                    Cantidad de invitados *
                  </Label>
                  <Input
                    id="guestCount"
                    type="number"
                    min={1}
                    max={tableCategory?.capacity || 50}
                    {...register('guestCount', { valueAsNumber: true })}
                    className="bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                  />
                  {errors.guestCount && (
                    <p className="text-xs text-red-400">
                      {errors.guestCount.message}
                    </p>
                  )}
                  <p className="text-xs text-white/30">
                    Capacidad maxima: {tableCategory?.capacity || 50} personas
                  </p>
                </div>

                {/* Guest Names */}
                <div className="space-y-2">
                  <Label htmlFor="guestNames" className="text-white/70">
                    Nombres de invitados (opcional)
                  </Label>
                  <Input
                    id="guestNames"
                    placeholder="Juan, Maria, Carlos..."
                    {...register('guestNames')}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
                  />
                  <p className="text-xs text-white/30">
                    Separa los nombres con comas
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-white/70">
                    Notas adicionales (opcional)
                  </Label>
                  <Input
                    id="notes"
                    placeholder="Cumpleanos, pedidos especiales..."
                    {...register('notes')}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-white/70">Metodo de Pago *</Label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* MercadoPago */}
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('mercadopago');
                        setValue('paymentMethod', 'mercadopago');
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        paymentMethod === 'mercadopago'
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          paymentMethod === 'mercadopago'
                            ? 'bg-purple-500/20'
                            : 'bg-white/5'
                        }`}
                      >
                        <CreditCard
                          className={`h-5 w-5 ${
                            paymentMethod === 'mercadopago'
                              ? 'text-purple-400'
                              : 'text-white/40'
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            paymentMethod === 'mercadopago'
                              ? 'text-white'
                              : 'text-white/60'
                          }`}
                        >
                          MercadoPago
                        </p>
                        <p className="text-xs text-white/30">
                          Tarjeta de credito o debito
                        </p>
                      </div>
                      {paymentMethod === 'mercadopago' && (
                        <CheckCircle className="ml-auto h-5 w-5 text-purple-400" />
                      )}
                    </button>

                    {/* Cash */}
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cash');
                        setValue('paymentMethod', 'cash');
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          paymentMethod === 'cash'
                            ? 'bg-green-500/20'
                            : 'bg-white/5'
                        }`}
                      >
                        <Banknote
                          className={`h-5 w-5 ${
                            paymentMethod === 'cash'
                              ? 'text-green-400'
                              : 'text-white/40'
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            paymentMethod === 'cash'
                              ? 'text-white'
                              : 'text-white/60'
                          }`}
                        >
                          Efectivo
                        </p>
                        <p className="text-xs text-white/30">
                          Pago en el evento
                        </p>
                      </div>
                      {paymentMethod === 'cash' && (
                        <CheckCircle className="ml-auto h-5 w-5 text-green-400" />
                      )}
                    </button>
                  </div>

                  <input
                    type="hidden"
                    {...register('paymentMethod')}
                    value={paymentMethod}
                  />
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    {...register('acceptTerms')}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                  />
                  <label
                    htmlFor="acceptTerms"
                    className="text-sm text-white/50"
                  >
                    Acepto los{' '}
                    <span className="text-purple-400 underline cursor-pointer">
                      terminos y condiciones
                    </span>{' '}
                    y la{' '}
                    <span className="text-purple-400 underline cursor-pointer">
                      politica de privacidad
                    </span>
                    .
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-xs text-red-400">
                    {errors.acceptTerms.message}
                  </p>
                )}

                {/* Error display */}
                {storeError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <p className="text-sm text-red-400">{storeError}</p>
                  </div>
                )}
              </form>
            </div>

            {/* Price Breakdown */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Resumen
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">
                      Mesa {selectedTable.number} ({tableCategory?.name})
                    </span>
                    <span className="text-white">
                      ${tablePrice.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Cargo por servicio</span>
                    <span className="text-white">
                      ${serviceFee.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-white">
                      Total
                    </span>
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      ${totalPrice.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                <Separator className="bg-white/10 my-4" />

                {/* Event info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-white/40">
                    <span className="font-medium text-white/60">Evento:</span>
                    <span className="truncate">{selectedEvent.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <span className="font-medium text-white/60">
                      Invitados:
                    </span>
                    <span>{watchedGuestCount || 1}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <span className="font-medium text-white/60">Pago:</span>
                    <span>
                      {paymentMethod === 'mercadopago'
                        ? 'MercadoPago'
                        : 'Efectivo'}
                    </span>
                  </div>
                </div>

                <Button
                  form="checkout-form"
                  type="submit"
                  disabled={submitting}
                  className="mt-6 w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-5 w-5" />
                      Confirmar Reserva
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-[11px] text-white/25">
                  <Shield className="inline-block h-3 w-3 mr-1" />
                  Pago seguro con encriptacion SSL
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
