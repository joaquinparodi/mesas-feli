'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Eye,
  LayoutGrid,
  ShoppingBag,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface EventItem {
  _id: string;
  title: string;
  date: string;
  endDate: string;
  status: string;
  venue?: { name: string };
  totalTables?: number;
  availableTables?: number;
  coverImage?: string;
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

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EventsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [eventRevenues, setEventRevenues] = useState<Record<string, number>>({});

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();

      if (data.success) {
        setEvents(data.data.items || []);
        setTotalPages(data.data.totalPages || 1);
        setTotal(data.data.total || 0);

        // Fetch revenue for each event
        const revenues: Record<string, number> = {};
        for (const event of data.data.items || []) {
          try {
            const analyticsRes = await fetch(`/api/analytics/${event._id}`);
            const analyticsData = await analyticsRes.json();
            if (analyticsData.success) {
              revenues[event._id] = analyticsData.data.totalRevenue || 0;
            }
          } catch {
            revenues[event._id] = 0;
          }
        }
        setEventRevenues(revenues);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los eventos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (eventId: string) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: 'Evento eliminado correctamente' });
        setDeleteDialog(null);
        fetchEvents();
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
        description: 'No se pudo eliminar el evento',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <p className="text-sm text-white/50">
            Gestiona todos tus eventos ({total})
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
            <Plus className="mr-2 h-4 w-4" />
            Crear Evento
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Buscar eventos..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/30"
              />
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <TabsList className="bg-white/5">
                <TabsTrigger value="all" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  Activos
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  Borrador
                </TabsTrigger>
                <TabsTrigger value="finished" className="text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  Finalizados
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-white/5" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Calendar className="h-12 w-12 text-white/20" />
              <p className="text-sm text-white/40">No se encontraron eventos</p>
              <Link href="/dashboard/events/new">
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500"
                >
                  Crear tu primer evento
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50">Titulo</TableHead>
                    <TableHead className="text-white/50">Fecha</TableHead>
                    <TableHead className="text-white/50">Estado</TableHead>
                    <TableHead className="text-white/50">Venue</TableHead>
                    <TableHead className="text-white/50">Ingresos</TableHead>
                    <TableHead className="text-right text-white/50">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event, i) => (
                    <motion.tr
                      key={event._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-white/5 hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/events/${event._id}`}
                          className="font-medium text-white/80 hover:text-purple-400 transition-colors"
                        >
                          {event.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-white/50">
                        {formatDate(event.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`border ${statusColors[event.status] || statusColors.draft}`}
                        >
                          {statusLabels[event.status] || event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white/50">
                        {event.venue?.name || '-'}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-400">
                        {formatCurrency(eventRevenues[event._id] || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-white/40 hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="border-white/10 bg-[#1a1a3e]"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/events/${event._id}`
                                )
                              }
                              className="text-white/70 focus:bg-white/10 focus:text-white"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/events/${event._id}/layout`
                                )
                              }
                              className="text-white/70 focus:bg-white/10 focus:text-white"
                            >
                              <LayoutGrid className="mr-2 h-4 w-4" />
                              Layout 3D
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/dashboard/events/${event._id}/sales`
                                )
                              }
                              className="text-white/70 focus:bg-white/10 focus:text-white"
                            >
                              <ShoppingBag className="mr-2 h-4 w-4" />
                              Ventas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/events/${event._id}`
                                )
                              }
                              className="text-white/70 focus:bg-white/10 focus:text-white"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Publico
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteDialog(event._id)}
                              className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                Pagina {page} de {totalPages} ({total} eventos)
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
                  onClick={() =>
                    setPage(Math.min(totalPages, page + 1))
                  }
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
      >
        <DialogContent className="border-white/10 bg-[#111128]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirmar eliminacion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">
            Esta accion eliminara el evento y todos sus datos asociados
            (mesas, categorias, reservas). Esta accion no se puede deshacer.
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              className="border-white/10 text-white/60"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-500"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
