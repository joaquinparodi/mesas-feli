'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Calendar,
  Trophy,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface EventOption {
  _id: string;
  title: string;
  date: string;
  status: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalReservations: number;
  occupancyRate: number;
  totalTables: number;
  soldTables: number;
  revenueByCategory: Array<{
    _id: string;
    categoryName: string;
    categoryColor: string;
    reservationCount: number;
    revenue: number;
  }>;
  salesOverTime: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
  topPromoters: Array<{
    _id: string;
    userName: string;
    userEmail: string;
    reservationCount: number;
    revenue: number;
    commissionRate: number;
    commission: number;
  }>;
  tableStatusDistribution: Record<string, number>;
}

const CHART_COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#f59e0b', '#06b6d4', '#ef4444'];

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
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#1a1a3e] px-3 py-2 shadow-lg">
        <p className="text-xs text-white/50">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' && p.value > 100
              ? formatCurrency(p.value)
              : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { toast } = useToast();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events?limit=50&sortBy=date&sortOrder=desc');
        const data = await res.json();
        if (data.success && data.data.items?.length > 0) {
          setEvents(data.data.items);
          setSelectedEvent(data.data.items[0]._id);
        }
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los eventos',
          variant: 'destructive',
        });
      }
    }
    fetchEvents();
  }, [toast]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (!selectedEvent) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `/api/analytics/${selectedEvent}?days=${days}`
      );
      const data = await res.json();

      if (data.success) {
        setAnalytics(data.data);
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
        description: 'No se pudieron cargar las analiticas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedEvent, days, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Transform data for charts
  const salesTimeData = (analytics?.salesOverTime || []).map((s) => ({
    date: formatDate(s._id),
    ingresos: s.revenue,
    ventas: s.count,
  }));

  const categoryPieData = (analytics?.revenueByCategory || []).map((c) => ({
    name: c.categoryName,
    value: c.revenue,
    color: c.categoryColor,
    count: c.reservationCount,
  }));

  const tableStatusData = analytics?.tableStatusDistribution
    ? Object.entries(analytics.tableStatusDistribution).map(
        ([status, count]) => ({
          name:
            status === 'available'
              ? 'Disponible'
              : status === 'reserved'
                ? 'Reservada'
                : status === 'sold'
                  ? 'Vendida'
                  : 'Bloqueada',
          value: count,
          color:
            status === 'available'
              ? '#22c55e'
              : status === 'reserved'
                ? '#f59e0b'
                : status === 'sold'
                  ? '#3b82f6'
                  : '#ef4444',
        })
      )
    : [];

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-white/5" />
          <Skeleton className="h-10 w-48 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 bg-white/5" />
          <Skeleton className="h-80 bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analiticas</h1>
          <p className="text-sm text-white/50">
            Metricas y estadisticas de tus eventos
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-56 border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Seleccionar evento" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#1a1a3e]">
              {events.map((event) => (
                <SelectItem
                  key={event._id}
                  value={event._id}
                  className="text-white/70 focus:bg-white/10 focus:text-white"
                >
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32 border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#1a1a3e]">
              <SelectItem value="7" className="text-white/70 focus:bg-white/10 focus:text-white">
                7 dias
              </SelectItem>
              <SelectItem value="14" className="text-white/70 focus:bg-white/10 focus:text-white">
                14 dias
              </SelectItem>
              <SelectItem value="30" className="text-white/70 focus:bg-white/10 focus:text-white">
                30 dias
              </SelectItem>
              <SelectItem value="90" className="text-white/70 focus:bg-white/10 focus:text-white">
                90 dias
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedEvent ? (
        <Card className="border-white/10 bg-[#111128]/80">
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-2 h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">
                Selecciona un evento para ver las analiticas
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">Ingresos</p>
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-green-400">
                    {formatCurrency(analytics?.totalRevenue || 0)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">Reservas</p>
                    <Calendar className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {analytics?.totalReservations || 0}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-rose-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">Ocupacion</p>
                    <TrendingUp className="h-4 w-4 text-pink-400" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {analytics?.occupancyRate || 0}%
                  </p>
                  <p className="text-xs text-white/30">
                    {analytics?.soldTables || 0}/{analytics?.totalTables || 0} mesas
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">Ticket Promedio</p>
                    <DollarSign className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {analytics?.totalReservations
                      ? formatCurrency(
                          (analytics.totalRevenue || 0) /
                            analytics.totalReservations
                        )
                      : '$0'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Revenue Over Time */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className="border-white/10 bg-[#111128]/80">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    Ingresos en el Tiempo
                  </CardTitle>
                  <CardDescription className="text-white/40">
                    Ultimos {days} dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {salesTimeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesTimeData}>
                          <defs>
                            <linearGradient
                              id="revenueGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#a855f7"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#a855f7"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                          <XAxis
                            dataKey="date"
                            stroke="#ffffff30"
                            fontSize={10}
                            tick={{ fill: '#ffffff40' }}
                          />
                          <YAxis
                            stroke="#ffffff30"
                            fontSize={10}
                            tick={{ fill: '#ffffff40' }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="ingresos"
                            name="Ingresos"
                            stroke="#a855f7"
                            strokeWidth={2}
                            fill="url(#revenueGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-white/30">
                          Sin datos para este periodo
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sales by Category */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="border-white/10 bg-[#111128]/80">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    Ventas por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {categoryPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            label={({ name, percent }: any) =>
                              `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                          >
                            {categoryPieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-white/30">
                          Sin datos de categorias
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Table Status Distribution */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <Card className="border-white/10 bg-[#111128]/80">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    Estado de Mesas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {tableStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tableStatusData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                          <XAxis
                            type="number"
                            stroke="#ffffff30"
                            fontSize={10}
                            tick={{ fill: '#ffffff40' }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#ffffff30"
                            fontSize={11}
                            tick={{ fill: '#ffffff60' }}
                            width={80}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" name="Mesas" radius={[0, 4, 4, 0]}>
                            {tableStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-white/30">
                          Sin datos de mesas
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Promoters Leaderboard */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <Card className="border-white/10 bg-[#111128]/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    Top Promotores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.topPromoters && analytics.topPromoters.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.topPromoters.map((promoter, i) => (
                        <div
                          key={promoter._id}
                          className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              i === 0
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : i === 1
                                  ? 'bg-gray-400/20 text-gray-300'
                                  : i === 2
                                    ? 'bg-amber-700/20 text-amber-500'
                                    : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white/80">
                              {promoter.userName || 'Promotor'}
                            </p>
                            <p className="text-xs text-white/30">
                              {promoter.reservationCount} ventas -{' '}
                              {promoter.commissionRate}% comision
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-400">
                              {formatCurrency(promoter.revenue)}
                            </p>
                            <p className="text-xs text-white/30">
                              Comision: {formatCurrency(promoter.commission || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center">
                      <div className="text-center">
                        <Users className="mx-auto mb-2 h-8 w-8 text-white/20" />
                        <p className="text-sm text-white/30">
                          No hay datos de promotores
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Revenue by Category Details */}
          {analytics?.revenueByCategory && analytics.revenueByCategory.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <Card className="border-white/10 bg-[#111128]/80">
                <CardHeader>
                  <CardTitle className="text-base text-white">
                    Heatmap de Categorias
                  </CardTitle>
                  <CardDescription className="text-white/40">
                    Rendimiento por categoria de mesa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {analytics.revenueByCategory.map((cat) => {
                      const maxRevenue = Math.max(
                        ...analytics.revenueByCategory.map((c) => c.revenue)
                      );
                      const intensity =
                        maxRevenue > 0
                          ? Math.round((cat.revenue / maxRevenue) * 100)
                          : 0;

                      return (
                        <div
                          key={cat._id}
                          className="relative overflow-hidden rounded-lg border border-white/5 p-4"
                          style={{
                            background: `linear-gradient(135deg, ${cat.categoryColor}${Math.round(intensity * 0.3).toString(16).padStart(2, '0')} 0%, transparent 100%)`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cat.categoryColor }}
                            />
                            <span className="text-sm font-medium text-white">
                              {cat.categoryName}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-white/40">Ingresos</p>
                              <p className="text-lg font-bold text-white">
                                {formatCurrency(cat.revenue)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-white/40">Reservas</p>
                              <p className="text-lg font-bold text-white">
                                {cat.reservationCount}
                              </p>
                            </div>
                          </div>
                          {/* Intensity bar */}
                          <div className="mt-2 h-1 w-full rounded-full bg-white/10">
                            <div
                              className="h-1 rounded-full transition-all"
                              style={{
                                width: `${intensity}%`,
                                backgroundColor: cat.categoryColor,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
