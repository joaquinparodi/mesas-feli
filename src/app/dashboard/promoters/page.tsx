'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  CheckCircle,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Link as LinkIcon,
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
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Promoter {
  _id: string;
  userId: { _id: string; name: string; email: string; phone?: string; avatar?: string };
  eventId: { _id: string; title: string; date: string; status: string };
  commissionRate: number;
  totalSales: number;
  totalEarnings: number;
  referralToken: string;
  isActive: boolean;
  reservationCount: number;
  createdAt: string;
}

interface EventOption {
  _id: string;
  title: string;
  date: string;
  status: string;
}

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

export default function PromotersPage() {
  const { toast } = useToast();

  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add promoter dialog
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    userEmail: '',
    eventId: '',
    commissionRate: 10,
  });
  const [adding, setAdding] = useState(false);
  const [foundUserId, setFoundUserId] = useState<string | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  // Referral link dialog
  const [linkDialog, setLinkDialog] = useState<Promoter | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPromoters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/promoters?limit=50');
      const data = await res.json();

      if (data.success) {
        setPromoters(data.data.items || []);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los promotores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events?limit=50&sortBy=date&sortOrder=desc');
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.items || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPromoters();
    fetchEvents();
  }, [fetchPromoters, fetchEvents]);

  const handleSearchUser = async () => {
    if (!addForm.userEmail) return;

    try {
      setSearchingUser(true);
      // We'll try to find the user by email via a simple approach
      // The API doesn't have a direct user search, so we'll pass the email
      // and let the backend validate on creation
      setFoundUserId(addForm.userEmail); // placeholder - the POST endpoint expects userId
      toast({ title: 'Usuario listo para asignar' });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo buscar el usuario',
        variant: 'destructive',
      });
    } finally {
      setSearchingUser(false);
    }
  };

  const handleAddPromoter = async () => {
    if (!addForm.userEmail || !addForm.eventId) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAdding(true);
      const res = await fetch('/api/promoters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: addForm.userEmail, // Could be userId or email depending on API
          eventId: addForm.eventId,
          commissionRate: addForm.commissionRate,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: 'Promotor agregado exitosamente' });
        setAddDialog(false);
        setAddForm({ userEmail: '', eventId: '', commissionRate: 10 });
        setFoundUserId(null);
        fetchPromoters();
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
        description: 'No se pudo agregar el promotor',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (promoterId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: currentActive ? 'Promotor desactivado' : 'Promotor activado',
        });
        fetchPromoters();
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
        description: 'No se pudo actualizar el promotor',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/events?ref=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copiado al portapapeles' });
  };

  // Summary stats
  const totalPromoters = promoters.length;
  const activePromoters = promoters.filter((p) => p.isActive).length;
  const totalCommissions = promoters.reduce(
    (sum, p) => sum + p.totalEarnings,
    0
  );
  const totalPromoterSales = promoters.reduce(
    (sum, p) => sum + p.totalSales,
    0
  );

  // Filter
  const filteredPromoters = promoters.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.userId?.name?.toLowerCase().includes(s) ||
      p.userId?.email?.toLowerCase().includes(s) ||
      p.eventId?.title?.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-96 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotores</h1>
          <p className="text-sm text-white/50">
            Gestiona tu equipo de promotores
          </p>
        </div>
        <Button
          onClick={() => setAddDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar Promotor
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Total Promotores</p>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {totalPromoters}
            </p>
            <p className="text-xs text-white/30">{activePromoters} activos</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Comisiones Totales</p>
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-green-400">
              {formatCurrency(totalCommissions)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-rose-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Ventas via Promotores</p>
              <TrendingUp className="h-4 w-4 text-pink-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {totalPromoterSales}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Tasa de Conversion</p>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {totalPromoters > 0
                ? Math.round(totalPromoterSales / totalPromoters)
                : 0}{' '}
              <span className="text-sm text-white/40">ventas/promo</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Buscar promotor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/30"
        />
      </div>

      {/* Promoters Table */}
      <Card className="border-white/10 bg-[#111128]/80">
        <CardContent className="p-0">
          {filteredPromoters.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Users className="h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">No hay promotores</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50">Nombre</TableHead>
                    <TableHead className="text-white/50">Evento</TableHead>
                    <TableHead className="text-white/50">Comision</TableHead>
                    <TableHead className="text-white/50">Ventas</TableHead>
                    <TableHead className="text-white/50">Ganancias</TableHead>
                    <TableHead className="text-white/50">Estado</TableHead>
                    <TableHead className="text-right text-white/50">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromoters.map((promoter, i) => (
                    <motion.tr
                      key={promoter._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-white/5 hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-white/80">
                            {promoter.userId?.name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-white/30">
                            {promoter.userId?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-white/60">
                          {promoter.eventId?.title || '-'}
                        </p>
                        <p className="text-xs text-white/30">
                          {promoter.eventId?.date
                            ? formatDate(promoter.eventId.date)
                            : ''}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className="border-purple-500/30 bg-purple-500/10 text-purple-300">
                          {promoter.commissionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white/70">
                        {promoter.totalSales}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-400">
                        {formatCurrency(promoter.totalEarnings)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            promoter.isActive
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : 'border-gray-500/30 bg-gray-500/10 text-gray-400'
                          }
                        >
                          {promoter.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLinkDialog(promoter)}
                            className="h-7 w-7 p-0 text-white/40 hover:text-blue-400"
                            title="Ver link referido"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleActive(
                                promoter._id,
                                promoter.isActive
                              )
                            }
                            className="h-7 w-7 p-0 text-white/40 hover:text-white"
                            title={
                              promoter.isActive ? 'Desactivar' : 'Activar'
                            }
                          >
                            {promoter.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-400" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Promoter Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="border-white/10 bg-[#111128]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Agregar Promotor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">ID de Usuario</Label>
              <Input
                value={addForm.userEmail}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    userEmail: e.target.value,
                  }))
                }
                placeholder="ID del usuario (MongoDB ObjectId)"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <p className="text-xs text-white/30">
                Ingresa el ID del usuario que sera promotor
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Evento</Label>
              <Select
                value={addForm.eventId}
                onValueChange={(v) =>
                  setAddForm((prev) => ({ ...prev, eventId: v }))
                }
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Seleccionar evento" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1a3e]">
                  {events.map((event) => (
                    <SelectItem
                      key={event._id}
                      value={event._id}
                      className="text-white/70 focus:bg-white/10 focus:text-white"
                    >
                      {event.title} - {formatDate(event.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">
                Comision (%)
              </Label>
              <Input
                type="number"
                value={addForm.commissionRate}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    commissionRate: parseInt(e.target.value) || 0,
                  }))
                }
                className="border-white/10 bg-white/5 text-white"
                min={0}
                max={100}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setAddDialog(false)}
                className="border-white/10 text-white/60"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddPromoter}
                disabled={adding || !addForm.userEmail || !addForm.eventId}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {adding ? 'Agregando...' : 'Agregar Promotor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Referral Link Dialog */}
      <Dialog open={!!linkDialog} onOpenChange={() => setLinkDialog(null)}>
        <DialogContent className="border-white/10 bg-[#111128]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Link de Referido
            </DialogTitle>
          </DialogHeader>
          {linkDialog && (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-white/40">Promotor</p>
                <p className="text-sm text-white/80">
                  {linkDialog.userId?.name} - {linkDialog.eventId?.title}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-white/40">Token</p>
                <p className="font-mono text-sm text-purple-400">
                  {linkDialog.referralToken}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-white/40">Link completo</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/events?ref=${linkDialog.referralToken}`}
                    className="border-white/10 bg-white/5 text-xs text-white"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleCopyLink(linkDialog.referralToken)}
                    className="bg-purple-600 hover:bg-purple-500"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-white/30">
                Comparte este link con el promotor para que lo distribuya a
                sus clientes.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
