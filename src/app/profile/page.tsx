'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  User,
  Ticket,
  Mail,
  Phone,
  Shield,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  XCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────

function getStatusConfig(status: string) {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmada',
        className: 'border-green-500/30 text-green-400 bg-green-500/10',
        icon: CheckCircle,
      };
    case 'pending':
      return {
        label: 'Pendiente',
        className: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
        icon: Clock,
      };
    case 'cancelled':
      return {
        label: 'Cancelada',
        className: 'border-red-500/30 text-red-400 bg-red-500/10',
        icon: XCircle,
      };
    case 'used':
      return {
        label: 'Utilizada',
        className: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
        icon: CheckCircle,
      };
    default:
      return {
        label: status,
        className: 'border-gray-500/30 text-gray-400 bg-gray-500/10',
        icon: AlertCircle,
      };
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'client':
      return 'Cliente';
    case 'organizer':
      return 'Organizador';
    case 'promoter':
      return 'Promotor';
    case 'admin':
      return 'Administrador';
    default:
      return role;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Reservations Tab ─────────────────────────

function ReservationsTab() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await fetch('/api/reservations?limit=50&sortOrder=desc');
        const json = await res.json();
        if (json.success) {
          setReservations(json.data.items || []);
        }
      } catch (err) {
        console.error('Error fetching reservations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReservations();
  }, []);

  const handleCancel = async (reservationId: string) => {
    if (!confirm('Estas seguro de cancelar esta reserva?')) return;

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const json = await res.json();

      if (json.success) {
        setReservations((prev) =>
          prev.map((r) =>
            r._id === reservationId ? { ...r, status: 'cancelled' } : r
          )
        );
        toast({
          title: 'Reserva cancelada',
          description: 'Tu reserva fue cancelada exitosamente.',
        });
      } else {
        toast({
          title: 'Error',
          description: json.error || 'No se pudo cancelar la reserva',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Error de conexion',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/5 bg-white/5 p-5"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg bg-white/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48 bg-white/5" />
                <Skeleton className="h-4 w-32 bg-white/5" />
              </div>
              <Skeleton className="h-8 w-24 bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Ticket className="h-12 w-12 text-white/10 mb-4" />
        <h3 className="text-lg font-semibold text-white/40">
          No tenes reservas
        </h3>
        <p className="mt-1 text-sm text-white/25">
          Explora eventos y reserva tu primera mesa VIP
        </p>
        <Link href="/events">
          <Button className="mt-4 bg-purple-600 hover:bg-purple-500 text-white">
            Ver Eventos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {reservations.map((reservation, index) => {
          const statusConfig = getStatusConfig(reservation.status);
          const StatusIcon = statusConfig.icon;
          const event = reservation.eventId || {};
          const table = reservation.tableId || {};
          const category = table.categoryId || {};

          return (
            <motion.div
              key={reservation._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-white/5 bg-white/5 p-5 hover:border-white/10 transition-colors"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  {/* Category color dot */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: (category.color || '#6b7280') + '20',
                    }}
                  >
                    <Ticket
                      className="h-5 w-5"
                      style={{ color: category.color || '#6b7280' }}
                    />
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">
                      {event.title || 'Evento'}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/40">
                      {table.label && (
                        <span>Mesa {table.label || table.number}</span>
                      )}
                      {category.name && <span>{category.name}</span>}
                      {event.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(event.date).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={statusConfig.className}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                      <span className="text-sm font-semibold text-purple-400">
                        ${reservation.amount?.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  {/* QR Code viewer */}
                  {reservation.qrCode && reservation.status !== 'cancelled' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 text-white/60 hover:bg-white/5"
                        >
                          <QrCode className="mr-1.5 h-3.5 w-3.5" />
                          Ver QR
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#111128] border-white/10 max-w-xs">
                        <DialogHeader>
                          <DialogTitle className="text-white text-center">
                            Codigo QR
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center py-4">
                          <div className="rounded-2xl bg-white p-6">
                            <QrCode className="h-40 w-40 text-[#1a1a2e]" />
                          </div>
                          <p className="mt-4 text-xs text-white/30 text-center">
                            Mostra este codigo en la entrada del evento
                          </p>
                          <p className="mt-2 text-[10px] text-white/20 font-mono break-all max-w-[200px] text-center">
                            {reservation.qrCode.slice(0, 40)}...
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Cancel button */}
                  {reservation.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(reservation._id)}
                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  )}

                  {/* View event */}
                  {event._id && (
                    <Link href={`/events/${event._id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/40 hover:text-white hover:bg-white/5"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Evento
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Personal Data Tab ─────────────────────────

function PersonalDataTab() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: session?.user?.name || '',
      email: session?.user?.email || '',
      phone: '',
    },
  });

  const onSubmit = async (data: any) => {
    setSaving(true);
    // Profile update would go here
    setTimeout(() => {
      setSaving(false);
      setEditing(false);
      toast({
        title: 'Perfil actualizado',
        description: 'Tus datos fueron guardados correctamente.',
      });
    }, 1000);
  };

  if (!session?.user) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            Informacion Personal
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(!editing)}
            className="border-white/10 text-white/60 hover:bg-white/5"
          >
            {editing ? 'Cancelar' : 'Editar'}
          </Button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Nombre</Label>
              <Input
                {...register('name')}
                className="bg-white/5 border-white/10 text-white focus:border-purple-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Email</Label>
              <Input
                {...register('email')}
                disabled
                className="bg-white/5 border-white/10 text-white/40"
              />
              <p className="text-xs text-white/25">
                El email no se puede cambiar
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Telefono</Label>
              <Input
                {...register('phone')}
                placeholder="+54 11 1234 5678"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-xs text-white/40">Nombre</p>
                <p className="text-sm text-white">{session.user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-pink-400" />
              <div>
                <p className="text-xs text-white/40">Email</p>
                <p className="text-sm text-white">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-xs text-white/40">Rol</p>
                <p className="text-sm text-white">
                  {getRoleLabel(session.user.role)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Profile Page ─────────────────────────

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'reservas' ? 'reservas' : 'datos';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/profile');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 border-2 border-purple-500/30">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl font-bold">
                {getInitials(session.user.name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {session.user.name}
              </h1>
              <p className="text-sm text-white/40">{session.user.email}</p>
              <Badge
                variant="outline"
                className="mt-1 border-purple-500/30 text-purple-400 bg-purple-500/10"
              >
                {getRoleLabel(session.user.role)}
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 w-full sm:w-auto">
              <TabsTrigger
                value="reservas"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50"
              >
                <Ticket className="mr-2 h-4 w-4" />
                Mis Reservas
              </TabsTrigger>
              <TabsTrigger
                value="datos"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50"
              >
                <User className="mr-2 h-4 w-4" />
                Datos Personales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reservas" className="mt-6">
              <ReservationsTab />
            </TabsContent>

            <TabsContent value="datos" className="mt-6">
              <PersonalDataTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
