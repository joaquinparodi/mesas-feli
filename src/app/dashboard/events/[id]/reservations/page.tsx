'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Ticket,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Reservation {
  _id: string;
  userId?: { name: string; email: string; phone?: string };
  tableId?: { label: string; number: number; sectorLabel: string; categoryId?: { name: string; color: string } };
  promoterId?: { name: string };
  status: string;
  paymentMethod?: string;
  amount: number;
  guestCount: number;
  guestNames: string[];
  notes?: string;
  qrCode: string;
  qrUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  used: 'Utilizada',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  used: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReservationsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailDialog, setDetailDialog] = useState<Reservation | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        eventId: id,
        page: page.toString(),
        limit: '15',
        sortOrder: 'desc',
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();

      if (data.success) {
        setReservations(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotal(data.data.total || 0);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las reservas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, page, statusFilter, toast]);

  useEffect(() => {
    if (id) fetchReservations();
  }, [id, fetchReservations]);

  const handleStatusChange = async (
    reservationId: string,
    newStatus: string
  ) => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: `Reserva ${statusLabels[newStatus]?.toLowerCase() || 'actualizada'}`,
        });
        fetchReservations();
        setDetailDialog(null);
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
        description: 'No se pudo actualizar la reserva',
        variant: 'destructive',
      });
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Cliente',
      'Email',
      'Mesa',
      'Categoria',
      'Monto',
      'Estado',
      'Pago',
      'Fecha',
    ];

    const rows = reservations.map((r) => [
      r._id,
      (r.userId as any)?.name || '',
      (r.userId as any)?.email || '',
      (r.tableId as any)?.label || '',
      (r.tableId as any)?.categoryId?.name || '',
      r.amount,
      statusLabels[r.status] || r.status,
      r.paymentMethod || '',
      new Date(r.createdAt).toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas-${id}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'CSV exportado correctamente' });
  };

  // Filter client-side by search and payment
  const filteredReservations = reservations.filter((r) => {
    if (paymentFilter !== 'all' && r.paymentMethod !== paymentFilter)
      return false;
    if (search) {
      const s = search.toLowerCase();
      const name = ((r.userId as any)?.name || '').toLowerCase();
      const email = ((r.userId as any)?.email || '').toLowerCase();
      if (!name.includes(s) && !email.includes(s)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <Skeleton className="h-12 bg-white/5" />
        <Skeleton className="h-96 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <h1 className="text-2xl font-bold text-white">Reservas</h1>
            <p className="text-sm text-white/50">{total} reservas totales</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="border-white/10 text-white/60"
          disabled={reservations.length === 0}
        >
          <Download className="mr-1 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/30"
            />
          </div>
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
              <SelectItem value="pending" className="text-white/70 focus:bg-white/10 focus:text-white">
                Pendiente
              </SelectItem>
              <SelectItem value="confirmed" className="text-white/70 focus:bg-white/10 focus:text-white">
                Confirmada
              </SelectItem>
              <SelectItem value="used" className="text-white/70 focus:bg-white/10 focus:text-white">
                Utilizada
              </SelectItem>
              <SelectItem value="cancelled" className="text-white/70 focus:bg-white/10 focus:text-white">
                Cancelada
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-sm text-white sm:w-40">
              <SelectValue placeholder="Pago" />
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardContent className="p-0">
          {filteredReservations.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Ticket className="h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">
                No se encontraron reservas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50">ID</TableHead>
                    <TableHead className="text-white/50">Cliente</TableHead>
                    <TableHead className="text-white/50">Mesa</TableHead>
                    <TableHead className="text-white/50">Monto</TableHead>
                    <TableHead className="text-white/50">Estado</TableHead>
                    <TableHead className="text-white/50">Pago</TableHead>
                    <TableHead className="text-white/50">Fecha</TableHead>
                    <TableHead className="text-right text-white/50">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((res, i) => (
                    <motion.tr
                      key={res._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-white/5 hover:bg-white/[0.02]"
                    >
                      <TableCell className="font-mono text-xs text-white/40">
                        {res._id.slice(-6)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-white/70">
                            {(res.userId as any)?.name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-white/30">
                            {(res.userId as any)?.email || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(res.tableId as any)?.categoryId?.color && (
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: (res.tableId as any).categoryId
                                  .color,
                              }}
                            />
                          )}
                          <span className="text-sm text-white/60">
                            {(res.tableId as any)?.label || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-400">
                        {formatCurrency(res.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`border text-xs ${statusColors[res.status] || ''}`}
                        >
                          {statusLabels[res.status] || res.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-white/50">
                        {res.paymentMethod === 'mercadopago'
                          ? 'MercadoPago'
                          : 'Efectivo'}
                      </TableCell>
                      <TableCell className="text-xs text-white/40">
                        {formatDate(res.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailDialog(res)}
                            className="h-7 w-7 p-0 text-white/40 hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {res.status === 'confirmed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(res._id, 'used')
                              }
                              className="h-7 w-7 p-0 text-green-400/60 hover:text-green-400"
                              title="Marcar como utilizada"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(res.status === 'pending' ||
                            res.status === 'confirmed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(res._id, 'cancelled')
                              }
                              className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400"
                              title="Cancelar reserva"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
              <p className="text-xs text-white/40">
                Pagina {page} de {totalPages}
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

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-md border-white/10 bg-[#111128]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Detalle de Reserva
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white/40">ID</p>
                  <p className="font-mono text-sm text-white/70">
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
                  <p className="text-xs text-white/40">Cliente</p>
                  <p className="text-sm text-white/70">
                    {(detailDialog.userId as any)?.name || 'Sin nombre'}
                  </p>
                  <p className="text-xs text-white/40">
                    {(detailDialog.userId as any)?.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Monto</p>
                  <p className="text-lg font-bold text-green-400">
                    {formatCurrency(detailDialog.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Mesa</p>
                  <p className="text-sm text-white/70">
                    {(detailDialog.tableId as any)?.label || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Metodo de Pago</p>
                  <p className="text-sm text-white/70">
                    {detailDialog.paymentMethod === 'mercadopago'
                      ? 'MercadoPago'
                      : 'Efectivo'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Invitados</p>
                  <p className="text-sm text-white/70">
                    {detailDialog.guestCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40">QR Usado</p>
                  <p className="text-sm text-white/70">
                    {detailDialog.qrUsed ? 'Si' : 'No'}
                  </p>
                </div>
              </div>

              {detailDialog.guestNames.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-white/40">
                    Nombres de Invitados
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {detailDialog.guestNames.map((name, i) => (
                      <Badge
                        key={i}
                        className="border-white/10 bg-white/5 text-xs text-white/50"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {detailDialog.notes && (
                <div>
                  <p className="mb-1 text-xs text-white/40">Notas</p>
                  <p className="text-sm text-white/60">{detailDialog.notes}</p>
                </div>
              )}

              <Separator className="bg-white/10" />

              <div className="flex justify-end gap-2">
                {detailDialog.status === 'confirmed' && (
                  <Button
                    size="sm"
                    onClick={() =>
                      handleStatusChange(detailDialog._id, 'used')
                    }
                    className="bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Marcar como Usada
                  </Button>
                )}
                {(detailDialog.status === 'pending' ||
                  detailDialog.status === 'confirmed') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleStatusChange(detailDialog._id, 'cancelled')
                    }
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
