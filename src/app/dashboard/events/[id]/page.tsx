'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LayoutGrid,
  TableProperties,
  ShoppingBag,
  Ticket,
  DollarSign,
  Users,
  TrendingUp,
  Pencil,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface EventData {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  status: string;
  venue?: { _id: string; name: string; address: string };
  coverImage?: string;
  tags: string[];
  totalTables: number;
  availableTables: number;
  tableCountsByStatus: Record<string, number>;
}

interface AnalyticsData {
  totalRevenue: number;
  totalReservations: number;
  occupancyRate: number;
  totalTables: number;
  soldTables: number;
  reservationsByStatus: Record<string, { count: number; revenue: number }>;
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  sold_out: 'Agotado',
  finished: 'Finalizado',
};

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  sold_out: 'bg-red-500/20 text-red-400 border-red-500/30',
  finished: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [event, setEvent] = useState<EventData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [eventRes, analyticsRes] = await Promise.all([
          fetch(`/api/events/${id}`),
          fetch(`/api/analytics/${id}`),
        ]);

        const eventData = await eventRes.json();
        if (eventData.success) {
          setEvent(eventData.data);
        }

        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.data);
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos del evento',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id, toast]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setChangingStatus(true);
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        setEvent((prev) => (prev ? { ...prev, status: newStatus } : prev));
        toast({ title: `Estado cambiado a ${statusLabels[newStatus]}` });
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado',
        variant: 'destructive',
      });
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl bg-white/5" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-400">Evento no encontrado</p>
          <Button
            onClick={() => router.push('/dashboard/events')}
            className="mt-4"
            variant="outline"
          >
            Volver a eventos
          </Button>
        </div>
      </div>
    );
  }

  const quickStats = [
    {
      label: 'Ingresos',
      value: formatCurrency(analytics?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/20',
    },
    {
      label: 'Mesas Vendidas',
      value: `${analytics?.soldTables || 0} / ${analytics?.totalTables || 0}`,
      icon: TableProperties,
      color: 'text-purple-400',
      bg: 'from-purple-500/20 to-violet-500/20',
      border: 'border-purple-500/20',
    },
    {
      label: 'Reservas',
      value: analytics?.totalReservations?.toString() || '0',
      icon: Ticket,
      color: 'text-pink-400',
      bg: 'from-pink-500/20 to-rose-500/20',
      border: 'border-pink-500/20',
    },
    {
      label: 'Ocupacion',
      value: `${analytics?.occupancyRate || 0}%`,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/20',
    },
  ];

  const managementLinks = [
    {
      title: 'Editor de Layout 3D',
      description: 'Posiciona mesas en el mapa 3D interactivo',
      href: `/dashboard/events/${id}/layout`,
      icon: LayoutGrid,
      color: 'text-purple-400',
      bg: 'from-purple-600/20 to-violet-600/20',
    },
    {
      title: 'Mesas y Categorias',
      description: 'Administra categorias, precios y mesas',
      href: `/dashboard/events/${id}/tables`,
      icon: TableProperties,
      color: 'text-cyan-400',
      bg: 'from-cyan-600/20 to-blue-600/20',
    },
    {
      title: 'Ventas en Vivo',
      description: 'Monitorea ventas en tiempo real',
      href: `/dashboard/events/${id}/sales`,
      icon: ShoppingBag,
      color: 'text-green-400',
      bg: 'from-green-600/20 to-emerald-600/20',
    },
    {
      title: 'Reservas',
      description: 'Gestiona todas las reservas del evento',
      href: `/dashboard/events/${id}/reservations`,
      icon: Ticket,
      color: 'text-pink-400',
      bg: 'from-pink-600/20 to-rose-600/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/events')}
            className="mt-1 text-white/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              <Badge
                className={`border ${statusColors[event.status] || statusColors.draft}`}
              >
                {statusLabels[event.status] || event.status}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/50">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(event.date)}
              </span>
              {event.venue && (
                <span className="flex items-center gap-1">
                  {event.venue.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={event.status}
            onValueChange={handleStatusChange}
            disabled={changingStatus}
          >
            <SelectTrigger className="w-40 border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#1a1a3e]">
              <SelectItem value="draft" className="text-white/70 focus:bg-white/10 focus:text-white">
                Borrador
              </SelectItem>
              <SelectItem value="active" className="text-white/70 focus:bg-white/10 focus:text-white">
                Activo
              </SelectItem>
              <SelectItem value="sold_out" className="text-white/70 focus:bg-white/10 focus:text-white">
                Agotado
              </SelectItem>
              <SelectItem value="finished" className="text-white/70 focus:bg-white/10 focus:text-white">
                Finalizado
              </SelectItem>
            </SelectContent>
          </Select>
          <Link href={`/events/${id}`} target="_blank">
            <Button variant="outline" size="sm" className="border-white/10 text-white/60">
              <Eye className="mr-1 h-4 w-4" />
              Ver
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {quickStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} variants={fadeInUp}>
              <Card
                className={`border ${stat.border} bg-gradient-to-br ${stat.bg}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">{stat.label}</p>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="mt-2 text-xl font-bold text-white">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Management Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Gestionar Evento
        </h2>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {managementLinks.map((link, i) => {
            const Icon = link.icon;
            return (
              <motion.div key={i} variants={fadeInUp}>
                <Link href={link.href}>
                  <Card className="group cursor-pointer border-white/10 bg-[#111128]/80 transition-all hover:border-purple-500/30 hover:bg-[#111128]">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${link.bg}`}
                      >
                        <Icon className={`h-6 w-6 ${link.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                          {link.title}
                        </h3>
                        <p className="text-xs text-white/40">
                          {link.description}
                        </p>
                      </div>
                      <div className="text-white/20 group-hover:text-purple-400 transition-colors">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Reservation Breakdown */}
      {analytics?.reservationsByStatus && (
        <Card className="border-white/10 bg-[#111128]/80">
          <CardHeader>
            <CardTitle className="text-base text-white">
              Desglose de Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  key: 'confirmed',
                  label: 'Confirmadas',
                  icon: CheckCircle,
                  color: 'text-green-400',
                },
                {
                  key: 'pending',
                  label: 'Pendientes',
                  icon: Clock,
                  color: 'text-yellow-400',
                },
                {
                  key: 'used',
                  label: 'Utilizadas',
                  icon: Ticket,
                  color: 'text-blue-400',
                },
                {
                  key: 'cancelled',
                  label: 'Canceladas',
                  icon: XCircle,
                  color: 'text-red-400',
                },
              ].map((item) => {
                const Icon = item.icon;
                const data = analytics.reservationsByStatus[item.key];
                return (
                  <div
                    key={item.key}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-xs text-white/50">
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-white">
                      {data?.count || 0}
                    </p>
                    <p className="text-xs text-white/30">
                      {formatCurrency(data?.revenue || 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
