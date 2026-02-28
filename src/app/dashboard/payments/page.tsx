'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Clock,
  XCircle,
  CheckCircle,
  Search,
  CreditCard,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  _id: string;
  reservationId:
    | string
    | {
        _id: string;
        userId?: { name: string; email: string };
        eventId?: { title: string };
        tableId?: { label: string };
        amount: number;
        status: string;
      };
  provider: string;
  externalId?: string;
  status: string;
  amount: number;
  currency: string;
  paidAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  refunded: 'Reembolsado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  refunded: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaymentsPage() {
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailDialog, setDetailDialog] = useState<Payment | null>(null);

  // Summary stats
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all events first to get their reservations
      const eventsRes = await fetch('/api/events?limit=50&sortBy=createdAt&sortOrder=desc');
      const eventsData = await eventsRes.json();

      if (!eventsData.success) throw new Error(eventsData.error);

      const allEvents = eventsData.data.items || [];
      const allPayments: Payment[] = [];

      // Get analytics for each event to calculate payments
      let received = 0;
      let pending = 0;
      let failed = 0;

      for (const event of allEvents.slice(0, 10)) {
        try {
          const analyticsRes = await fetch(`/api/analytics/${event._id}`);
          const analyticsData = await analyticsRes.json();

          if (analyticsData.success) {
            const data = analyticsData.data;
            const statusBreakdown = data.reservationsByStatus || {};

            // Sum from reservation statuses
            if (statusBreakdown.confirmed) {
              received += statusBreakdown.confirmed.revenue || 0;
            }
            if (statusBreakdown.used) {
              received += statusBreakdown.used.revenue || 0;
            }
            if (statusBreakdown.pending) {
              pending += statusBreakdown.pending.revenue || 0;
            }
            if (statusBreakdown.cancelled) {
              failed += statusBreakdown.cancelled.revenue || 0;
            }
          }
        } catch {
          // Skip
        }
      }

      // Fetch reservations as "payments" view
      try {
        const reservationsRes = await fetch(
          '/api/reservations?limit=50&sortOrder=desc'
        );
        const reservationsData = await reservationsRes.json();

        if (reservationsData.success) {
          const items = reservationsData.data.items || [];
          // Transform reservations to payment-like objects
          const transformedPayments: Payment[] = items.map((r: any) => ({
            _id: r._id,
            reservationId: r,
            provider: r.paymentMethod || 'cash',
            externalId: r.paymentId || undefined,
            status:
              r.status === 'confirmed' || r.status === 'used'
                ? 'approved'
                : r.status === 'cancelled'
                  ? 'rejected'
                  : 'pending',
            amount: r.amount,
            currency: 'ARS',
            paidAt: r.status === 'confirmed' || r.status === 'used' ? r.updatedAt : undefined,
            createdAt: r.createdAt,
            metadata: {},
          }));

          allPayments.push(...transformedPayments);
        }
      } catch {
        // silent
      }

      setPayments(allPayments);
      setTotalReceived(received);
      setTotalPending(pending);
      setTotalFailed(failed);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pagos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Client-side filtering
  const filteredPayments = payments.filter((p) => {
    if (providerFilter !== 'all' && p.provider !== providerFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const resData = p.reservationId as any;
      const clientName = resData?.userId?.name?.toLowerCase() || '';
      const clientEmail = resData?.userId?.email?.toLowerCase() || '';
      if (!clientName.includes(s) && !clientEmail.includes(s) && !p._id.includes(s)) {
        return false;
      }
    }
    return true;
  });

  // Paginate
  const perPage = 15;
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / perPage));
  const paginatedPayments = filteredPayments.slice(
    (page - 1) * perPage,
    page * perPage
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-96 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Pagos</h1>
        <p className="text-sm text-white/50">
          Reconciliacion y seguimiento de pagos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">Total Recibido</p>
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-green-400">
                {formatCurrency(totalReceived)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">Pendiente</p>
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-yellow-400">
                {formatCurrency(totalPending)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-red-500/20 bg-gradient-to-br from-red-500/10 to-rose-500/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/50">Fallido / Cancelado</p>
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-red-400">
                {formatCurrency(totalFailed)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Buscar por cliente o ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/30"
            />
          </div>
          <Select
            value={providerFilter}
            onValueChange={(v) => {
              setProviderFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-sm text-white sm:w-40">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#1a1a3e]">
              <SelectItem value="all" className="text-white/70 focus:bg-white/10 focus:text-white">
                Todos
              </SelectItem>
              <SelectItem value="mercadopago" className="text-white/70 focus:bg-white/10 focus:text-white">
                MercadoPago
              </SelectItem>
              <SelectItem value="cash" className="text-white/70 focus:bg-white/10 focus:text-white">
                Efectivo
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-sm text-white sm:w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#1a1a3e]">
              <SelectItem value="all" className="text-white/70 focus:bg-white/10 focus:text-white">
                Todos
              </SelectItem>
              <SelectItem value="approved" className="text-white/70 focus:bg-white/10 focus:text-white">
                Aprobado
              </SelectItem>
              <SelectItem value="pending" className="text-white/70 focus:bg-white/10 focus:text-white">
                Pendiente
              </SelectItem>
              <SelectItem value="rejected" className="text-white/70 focus:bg-white/10 focus:text-white">
                Rechazado
              </SelectItem>
              <SelectItem value="refunded" className="text-white/70 focus:bg-white/10 focus:text-white">
                Reembolsado
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardContent className="p-0">
          {paginatedPayments.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <CreditCard className="h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">No se encontraron pagos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50">Fecha</TableHead>
                    <TableHead className="text-white/50">Cliente</TableHead>
                    <TableHead className="text-white/50">Evento</TableHead>
                    <TableHead className="text-white/50">Monto</TableHead>
                    <TableHead className="text-white/50">Proveedor</TableHead>
                    <TableHead className="text-white/50">Estado</TableHead>
                    <TableHead className="text-right text-white/50">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((payment, i) => {
                    const resData = payment.reservationId as any;
                    return (
                      <motion.tr
                        key={payment._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-white/5 hover:bg-white/[0.02]"
                      >
                        <TableCell className="text-xs text-white/50">
                          {formatDate(payment.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-white/70">
                              {resData?.userId?.name || 'Cliente'}
                            </p>
                            <p className="text-xs text-white/30">
                              {resData?.userId?.email || ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-white/60">
                          {resData?.eventId?.title || '-'}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-white">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          {payment.provider === 'mercadopago' ? (
                            <Badge className="border-blue-500/30 bg-blue-500/10 text-xs text-blue-400">
                              <CreditCard className="mr-1 h-3 w-3" />
                              MP
                            </Badge>
                          ) : (
                            <Badge className="border-green-500/30 bg-green-500/10 text-xs text-green-400">
                              <Banknote className="mr-1 h-3 w-3" />
                              Cash
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`border text-xs ${statusColors[payment.status] || ''}`}
                          >
                            {statusLabels[payment.status] || payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailDialog(payment)}
                            className="h-7 w-7 p-0 text-white/40 hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
              <p className="text-xs text-white/40">
                Pagina {page} de {totalPages} ({filteredPayments.length} pagos)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="border-white/10 text-white/60"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="border-white/10 text-white/60"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-md border-white/10 bg-[#111128]">
          <DialogHeader>
            <DialogTitle className="text-white">Detalle de Pago</DialogTitle>
          </DialogHeader>
          {detailDialog && (() => {
            const resData = detailDialog.reservationId as any;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/40">ID</p>
                    <p className="font-mono text-xs text-white/70">
                      {detailDialog._id.slice(-8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Estado</p>
                    <Badge
                      className={`mt-1 border text-xs ${statusColors[detailDialog.status]}`}
                    >
                      {statusLabels[detailDialog.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Monto</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(detailDialog.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Moneda</p>
                    <p className="text-sm text-white/70">
                      {detailDialog.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Proveedor</p>
                    <p className="text-sm text-white/70">
                      {detailDialog.provider === 'mercadopago'
                        ? 'MercadoPago'
                        : 'Efectivo'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Fecha de Creacion</p>
                    <p className="text-sm text-white/70">
                      {formatDate(detailDialog.createdAt)}
                    </p>
                  </div>
                  {detailDialog.paidAt && (
                    <div>
                      <p className="text-xs text-white/40">Fecha de Pago</p>
                      <p className="text-sm text-white/70">
                        {formatDate(detailDialog.paidAt)}
                      </p>
                    </div>
                  )}
                  {detailDialog.externalId && (
                    <div>
                      <p className="text-xs text-white/40">ID Externo</p>
                      <p className="font-mono text-xs text-white/70">
                        {detailDialog.externalId}
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <p className="mb-2 text-xs font-medium text-white/50">
                    Datos de Reserva
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-white/40">Cliente</p>
                      <p className="text-sm text-white/70">
                        {resData?.userId?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Email</p>
                      <p className="text-sm text-white/70">
                        {resData?.userId?.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Evento</p>
                      <p className="text-sm text-white/70">
                        {resData?.eventId?.title || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Mesa</p>
                      <p className="text-sm text-white/70">
                        {resData?.tableId?.label || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
