'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  ShoppingBag,
  TrendingUp,
  User,
  CreditCard,
  Banknote,
  Zap,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface SaleItem {
  _id: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  userId?: { name: string; email: string };
  tableId?: { label: string; number: number; sectorLabel: string };
  promoterId?: string;
}

interface HourlySale {
  hour: string;
  revenue: number;
  count: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getTimeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

export default function SalesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [sales, setSales] = useState<SaleItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [hourlySales, setHourlySales] = useState<HourlySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      const [analyticsRes] = await Promise.all([
        fetch(`/api/analytics/${id}?days=1`),
      ]);

      const analyticsData = await analyticsRes.json();

      if (analyticsData.success) {
        const data = analyticsData.data;
        setTotalRevenue(data.totalRevenue || 0);

        // Calculate today's revenue from salesOverTime
        const today = new Date().toISOString().split('T')[0];
        const todaySales = data.salesOverTime?.find(
          (s: any) => s._id === today
        );
        setTodayRevenue(todaySales?.revenue || 0);

        // Generate hourly data
        const hours: HourlySale[] = [];
        for (let h = 0; h < 24; h++) {
          hours.push({
            hour: `${h.toString().padStart(2, '0')}:00`,
            revenue: 0,
            count: 0,
          });
        }
        setHourlySales(hours);
      }

      // Fetch recent reservations for this event
      // We use the general reservations endpoint filtered by event
      try {
        const reservationsRes = await fetch(
          `/api/reservations?eventId=${id}&limit=20&sortOrder=desc`
        );
        const reservationsData = await reservationsRes.json();
        if (reservationsData.success) {
          setSales(reservationsData.data.items || []);
        }
      } catch {
        // fallback: empty sales
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ventas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Polling for live updates
  useEffect(() => {
    if (liveMode) {
      intervalRef.current = setInterval(fetchSales, 15000); // Every 15 seconds
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveMode, fetchSales]);

  // Pusher real-time (optional enhancement)
  useEffect(() => {
    let channel: any;
    let cancelled = false;

    (async () => {
      try {
        const { getPusherClient, channels: pusherChannels, pusherEvents } =
          await import('@/lib/pusher');
        if (cancelled) return;
        const pusher = getPusherClient();
        channel = pusher.subscribe(pusherChannels.eventReservations(id));

        channel.bind(pusherEvents.RESERVATION_CREATED, (data: any) => {
          // Add new sale to top of feed
          setSales((prev) => [data, ...prev].slice(0, 50));
          setTotalRevenue((prev) => prev + (data.amount || 0));
          setTodayRevenue((prev) => prev + (data.amount || 0));
        });
      } catch {
        // Pusher not available, rely on polling
      }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        try {
          channel.unbind_all();
          channel.unsubscribe();
        } catch {}
      }
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-64 bg-white/5" />
        <Skeleton className="h-96 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/events/${id}`)}
            className="text-white/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Ventas en Vivo</h1>
            <p className="text-sm text-white/50">
              Feed de ventas en tiempo real
            </p>
          </div>
        </div>
        <Button
          variant={liveMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLiveMode(!liveMode)}
          className={
            liveMode
              ? 'bg-green-600 hover:bg-green-500'
              : 'border-white/10 text-white/60'
          }
        >
          <Zap className="mr-1 h-4 w-4" />
          {liveMode ? 'En Vivo' : 'Pausado'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">Ingresos Totales</p>
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <motion.p
                key={totalRevenue}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="mt-2 text-3xl font-bold text-green-400"
              >
                {formatCurrency(totalRevenue)}
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-500/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">Ingresos Hoy</p>
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <motion.p
                key={todayRevenue}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="mt-2 text-3xl font-bold text-purple-400"
              >
                {formatCurrency(todayRevenue)}
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-rose-500/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">Ventas Totales</p>
                <ShoppingBag className="h-5 w-5 text-pink-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-pink-400">
                {sales.length}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hourly Sales Chart */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardHeader>
          <CardTitle className="text-base text-white">
            Ventas por Hora (Hoy)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySales}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis
                  dataKey="hour"
                  stroke="#ffffff30"
                  fontSize={11}
                  tick={{ fill: '#ffffff40' }}
                />
                <YAxis
                  stroke="#ffffff30"
                  fontSize={11}
                  tick={{ fill: '#ffffff40' }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a3e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [formatCurrency(value ?? 0), 'Ingresos']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Live Sales Feed */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                liveMode ? 'animate-pulse bg-green-500' : 'bg-gray-500'
              }`}
            />
            <CardTitle className="text-base text-white">
              Feed de Ventas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            <AnimatePresence mode="popLayout">
              {sales.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="text-center">
                    <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-white/20" />
                    <p className="text-sm text-white/40">
                      No hay ventas aun. Las nuevas ventas apareceran aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map((sale, i) => (
                    <motion.div
                      key={sale._id || i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                    >
                      {/* Time */}
                      <div className="flex-shrink-0 text-center">
                        <p className="text-xs font-medium text-white/60">
                          {formatTime(sale.createdAt)}
                        </p>
                        <p className="text-[10px] text-white/30">
                          {getTimeAgo(sale.createdAt)}
                        </p>
                      </div>

                      {/* User */}
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-600/20">
                        <User className="h-4 w-4 text-purple-400" />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/80">
                          {(sale.userId as any)?.name || 'Cliente'}
                        </p>
                        <p className="text-xs text-white/40">
                          Mesa{' '}
                          {(sale.tableId as any)?.label ||
                            (sale.tableId as any)?.number ||
                            '-'}
                          {(sale.tableId as any)?.sectorLabel &&
                            ` - ${(sale.tableId as any).sectorLabel}`}
                        </p>
                      </div>

                      {/* Payment method */}
                      <div className="flex-shrink-0">
                        {sale.paymentMethod === 'mercadopago' ? (
                          <Badge className="border-blue-500/30 bg-blue-500/10 text-xs text-blue-400">
                            <CreditCard className="mr-1 h-3 w-3" />
                            MP
                          </Badge>
                        ) : (
                          <Badge className="border-green-500/30 bg-green-500/10 text-xs text-green-400">
                            <Banknote className="mr-1 h-3 w-3" />
                            Efectivo
                          </Badge>
                        )}
                      </div>

                      {/* Promoter indicator */}
                      {sale.promoterId && (
                        <Badge className="border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-400">
                          Promo
                        </Badge>
                      )}

                      {/* Amount */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-lg font-bold text-green-400">
                          {formatCurrency(sale.amount)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
