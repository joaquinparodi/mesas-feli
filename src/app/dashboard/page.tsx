'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Calendar,
  Ticket,
  TrendingUp,
  ArrowRight,
  Clock,
  User,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KPIData {
  totalRevenue: number;
  activeEvents: number;
  totalReservations: number;
  occupancyRate: number;
}

interface RecentSale {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  userId?: { name: string; email: string };
  tableId?: { label: string; number: number };
  eventId?: { title: string };
}

interface EventItem {
  _id: string;
  title: string;
  date: string;
  status: string;
  totalTables?: number;
  availableTables?: number;
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  sold_out: 'Agotado',
  finished: 'Finalizado',
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  used: 'Utilizada',
};

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  sold_out: 'bg-red-500/20 text-red-400 border-red-500/30',
  finished: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  used: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function DashboardOverview() {
  const { data: session } = useSession();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // Fetch organizer's events
        const eventsRes = await fetch('/api/events?limit=50&sortBy=date&sortOrder=desc');
        const eventsData = await eventsRes.json();

        if (!eventsData.success) throw new Error(eventsData.error);

        const allEvents = eventsData.data.items || [];

        // Filter only organizer's events if needed
        const activeEvents = allEvents.filter(
          (e: any) => e.status === 'active'
        );

        setEvents(allEvents.slice(0, 5));

        // Calculate KPIs from events analytics
        let totalRevenue = 0;
        let totalReservations = 0;
        let totalTables = 0;
        let soldTables = 0;
        const salesList: RecentSale[] = [];

        // Fetch analytics for each active or recent event
        const eventIds = allEvents.slice(0, 10).map((e: any) => e._id);

        for (const eventId of eventIds) {
          try {
            const analyticsRes = await fetch(`/api/analytics/${eventId}`);
            const analyticsData = await analyticsRes.json();
            if (analyticsData.success) {
              totalRevenue += analyticsData.data.totalRevenue || 0;
              totalReservations += analyticsData.data.totalReservations || 0;
              totalTables += analyticsData.data.totalTables || 0;
              soldTables += analyticsData.data.soldTables || 0;
            }
          } catch {
            // Skip events where analytics fail
          }
        }

        // Fetch recent reservations
        try {
          const reservationsRes = await fetch(
            '/api/reservations?limit=10&sortOrder=desc'
          );
          const reservationsData = await reservationsRes.json();
          if (reservationsData.success) {
            salesList.push(...(reservationsData.data.items || []));
          }
        } catch {
          // Skip if reservations fail
        }

        const occupancyRate =
          totalTables > 0
            ? Math.round((soldTables / totalTables) * 100)
            : 0;

        setKpis({
          totalRevenue,
          activeEvents: activeEvents.length,
          totalReservations,
          occupancyRate,
        });
        setRecentSales(salesList);
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="mb-2 h-8 w-64 bg-white/5" />
          <Skeleton className="h-4 w-96 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl bg-white/5" />
          <Skeleton className="h-96 rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-400">Error al cargar el dashboard</p>
          <p className="mt-1 text-sm text-white/40">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(kpis?.totalRevenue || 0),
      icon: DollarSign,
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Eventos Activos',
      value: kpis?.activeEvents?.toString() || '0',
      icon: Calendar,
      gradient: 'from-purple-500/20 to-violet-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'Reservas Totales',
      value: kpis?.totalReservations?.toString() || '0',
      icon: Ticket,
      gradient: 'from-pink-500/20 to-rose-500/20',
      iconColor: 'text-pink-400',
      borderColor: 'border-pink-500/20',
    },
    {
      title: 'Tasa de Ocupacion',
      value: `${kpis?.occupancyRate || 0}%`,
      icon: TrendingUp,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Bienvenido, {session?.user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Aqui tienes un resumen de tu actividad reciente
        </p>
      </div>

      {/* KPI Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={i} variants={fadeInUp}>
              <Card
                className={`border ${kpi.borderColor} bg-gradient-to-br ${kpi.gradient} backdrop-blur-sm`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-white/50">
                        {kpi.title}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {kpi.value}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg bg-white/5 p-2.5 ${kpi.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <motion.div variants={fadeInUp} initial="hidden" animate="show">
          <Card className="border-white/10 bg-[#111128]/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base text-white">
                  Ventas Recientes
                </CardTitle>
                <CardDescription className="text-white/40">
                  Ultimas 10 reservas
                </CardDescription>
              </div>
              <Link href="/dashboard/payments">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Ver todo
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[380px]">
                {recentSales.length === 0 ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-white/30">
                      No hay ventas recientes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSales.map((sale, i) => (
                      <div
                        key={sale._id || i}
                        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600/20">
                          <User className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white/80">
                            {(sale.userId as any)?.name || 'Cliente'}
                          </p>
                          <p className="text-xs text-white/40">
                            Mesa {(sale.tableId as any)?.label || (sale.tableId as any)?.number || '-'}{' '}
                            {(sale.eventId as any)?.title
                              ? `- ${(sale.eventId as any).title}`
                              : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-400">
                            {formatCurrency(sale.amount)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-white/30">
                            <Clock className="h-3 w-3" />
                            {formatTime(sale.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links & Recent Events */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Quick Actions */}
          <Card className="border-white/10 bg-[#111128]/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">
                Acciones Rapidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/events/new">
                  <Button className="h-auto w-full flex-col gap-2 bg-gradient-to-br from-purple-600/30 to-pink-600/30 py-4 text-white hover:from-purple-600/40 hover:to-pink-600/40">
                    <Calendar className="h-5 w-5" />
                    <span className="text-xs">Crear Evento</span>
                  </Button>
                </Link>
                <Link href="/dashboard/events">
                  <Button className="h-auto w-full flex-col gap-2 bg-white/5 py-4 text-white/70 hover:bg-white/10">
                    <Ticket className="h-5 w-5" />
                    <span className="text-xs">Gestionar Eventos</span>
                  </Button>
                </Link>
                <Link href="/dashboard/promoters">
                  <Button className="h-auto w-full flex-col gap-2 bg-white/5 py-4 text-white/70 hover:bg-white/10">
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Promotores</span>
                  </Button>
                </Link>
                <Link href="/dashboard/analytics">
                  <Button className="h-auto w-full flex-col gap-2 bg-white/5 py-4 text-white/70 hover:bg-white/10">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-xs">Analiticas</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card className="border-white/10 bg-[#111128]/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base text-white">
                  Eventos Recientes
                </CardTitle>
                <CardDescription className="text-white/40">
                  Tus ultimos eventos creados
                </CardDescription>
              </div>
              <Link href="/dashboard/events">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Ver todo
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-white/30">
                      No tienes eventos aun
                    </p>
                    <Link href="/dashboard/events/new">
                      <Button
                        size="sm"
                        className="mt-2 bg-purple-600 hover:bg-purple-500"
                      >
                        Crear tu primer evento
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <Link
                      key={event._id}
                      href={`/dashboard/events/${event._id}`}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/80">
                          {event.title}
                        </p>
                        <p className="text-xs text-white/40">
                          {formatDate(event.date)}
                        </p>
                      </div>
                      <Badge
                        className={`ml-2 border ${statusColors[event.status] || statusColors.draft}`}
                      >
                        {statusLabels[event.status] || event.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
