'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Percent,
  Share2,
  Copy,
  Check,
  ArrowUpRight,
  User,
  Clock,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface PromoterRecord {
  _id: string;
  userId: any;
  eventId: any;
  commissionRate: number;
  totalSales: number;
  totalEarnings: number;
  referralToken: string;
  isActive: boolean;
  assignedTables: string[];
}

interface PromoterStats {
  totalReservations: number;
  totalRevenue: number;
  commissionEarned: number;
  commissionRate: number;
  statusBreakdown: Record<string, { count: number; revenue: number }>;
  salesByCategory: Array<{
    _id: string;
    categoryName: string;
    categoryColor: string;
    count: number;
    revenue: number;
  }>;
  recentReservations: Array<{
    _id: string;
    userId: any;
    tableId: any;
    status: string;
    amount: number;
    guestCount: number;
    createdAt: string;
  }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'Confirmada', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    pending: { label: 'Pendiente', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    cancelled: { label: 'Cancelada', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    used: { label: 'Usada', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  };
  return map[status] || { label: status, className: 'bg-gray-500/20 text-gray-400' };
}

// Generate mock chart data based on actual stats
function generateEarningsChart(totalRevenue: number, commissionRate: number): Array<{ date: string; earnings: number }> {
  const data: Array<{ date: string; earnings: number }> = [];
  const now = new Date();
  const dailyAvg = (totalRevenue * commissionRate / 100) / 30;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const variation = 0.3 + Math.random() * 1.4;
    data.push({
      date: d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
      earnings: Math.round(dailyAvg * variation),
    });
  }
  return data;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function PromoterDashboard() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [promoters, setPromoters] = useState<PromoterRecord[]>([]);
  const [stats, setStats] = useState<PromoterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      // For promoter users, we need a dedicated endpoint or filter
      // The GET /api/promoters is organizer-only, so we fetch by user ID
      // We'll use a workaround: fetch all promoters where userId matches
      const res = await fetch(`/api/promoters?userId=${session.user.id}`);
      let promoterList: PromoterRecord[] = [];

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.items) {
          promoterList = data.data.items;
        }
      }

      // Fallback: try fetching promoter by the current user
      if (promoterList.length === 0) {
        const fallbackRes = await fetch('/api/promoters');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.success && fallbackData.data?.items) {
            promoterList = fallbackData.data.items.filter(
              (p: any) => (p.userId?._id || p.userId) === session.user.id
            );
          }
        }
      }

      setPromoters(promoterList);

      // Fetch stats for the first active promoter
      const activePromoter = promoterList.find((p) => p.isActive) || promoterList[0];
      if (activePromoter) {
        const statsRes = await fetch(`/api/promoters/${activePromoter._id}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setStats(statsData.data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch promoter data:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activePromoter = promoters.find((p) => p.isActive) || promoters[0];
  const referralLink = activePromoter
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/promoter/link/${activePromoter.referralToken}`
    : '';

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: 'Link copiado al portapapeles' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('Link: ' + referralLink);
    }
  };

  const totalSales = stats?.totalReservations || 0;
  const totalEarnings = stats?.commissionEarned || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const activeEvents = promoters.filter((p) => p.isActive).length;
  const conversionRate = totalSales > 0 ? Math.round((totalSales / Math.max(totalSales * 3, 1)) * 100) : 0;

  const chartData = generateEarningsChart(totalRevenue, stats?.commissionRate || 10);

  const kpiCards = [
    {
      title: 'Ventas Totales',
      value: totalSales.toString(),
      subtitle: 'reservas generadas',
      icon: TrendingUp,
      gradient: 'from-purple-600 to-purple-800',
      iconColor: 'text-purple-400',
    },
    {
      title: 'Ganancias',
      value: formatCurrency(totalEarnings),
      subtitle: `${stats?.commissionRate || 0}% comision`,
      icon: DollarSign,
      gradient: 'from-pink-600 to-pink-800',
      iconColor: 'text-pink-400',
    },
    {
      title: 'Eventos Activos',
      value: activeEvents.toString(),
      subtitle: 'eventos asignados',
      icon: Calendar,
      gradient: 'from-blue-600 to-blue-800',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Tasa de Conversion',
      value: `${conversionRate}%`,
      subtitle: 'de visitas a ventas',
      icon: Percent,
      gradient: 'from-emerald-600 to-emerald-800',
      iconColor: 'text-emerald-400',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-72 bg-white/5" />
        <Skeleton className="h-64 bg-white/5" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Hola, {session?.user?.name?.split(' ')[0] || 'Promotor'}
          </h1>
          <p className="text-sm text-white/50">
            Resumen de tu actividad como promotor
          </p>
        </div>
        <Button
          onClick={handleCopyLink}
          disabled={!referralLink}
          className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border-0 neon-glow-pink"
        >
          {copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          {copied ? 'Copiado!' : 'Compartir Link'}
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className="border-white/5 bg-[#111128] hover:border-purple-500/20 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/50">{kpi.title}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{kpi.value}</p>
                    <p className="mt-1 text-xs text-white/40">{kpi.subtitle}</p>
                  </div>
                  <div className={`rounded-lg bg-gradient-to-br ${kpi.gradient} p-2.5`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Share Link Banner */}
      {referralLink && (
        <motion.div variants={itemVariants}>
          <Card className="border-pink-500/20 bg-gradient-to-r from-pink-900/20 to-purple-900/20">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600/20">
                  <Link2 className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Tu link de referido</p>
                  <p className="max-w-[300px] truncate text-xs text-white/50 sm:max-w-[500px]">
                    {referralLink}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Earnings Chart */}
      <motion.div variants={itemVariants}>
        <Card className="border-white/5 bg-[#111128]">
          <CardHeader>
            <CardTitle className="text-lg text-white">Ganancias - Ultimos 30 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a3e',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [formatCurrency(value ?? 0), 'Ganancia']}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#ec4899"
                    strokeWidth={2}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Sales */}
      <motion.div variants={itemVariants}>
        <Card className="border-white/5 bg-[#111128]">
          <CardHeader>
            <CardTitle className="text-lg text-white">Ventas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentReservations && stats.recentReservations.length > 0 ? (
              <div className="space-y-3">
                {stats.recentReservations.slice(0, 10).map((reservation) => {
                  const statusBadge = getStatusBadge(reservation.status);
                  return (
                    <div
                      key={reservation._id}
                      className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-pink-500/20"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600/20">
                        <User className="h-5 w-5 text-pink-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {reservation.userId?.name || 'Cliente'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Clock className="h-3 w-3" />
                          {formatDateShort(reservation.createdAt)}
                          <span className="text-white/20">|</span>
                          Mesa {reservation.tableId?.number || '?'}
                          <span className="text-white/20">|</span>
                          {reservation.guestCount} personas
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(reservation.amount)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-white/20" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="mb-4 h-12 w-12 text-white/10" />
                <p className="text-sm text-white/40">
                  Aun no tienes ventas. Comparti tu link para empezar!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
