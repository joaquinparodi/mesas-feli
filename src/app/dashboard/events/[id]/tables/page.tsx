'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Search,
  LayoutGrid,
  Table2,
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
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface Category {
  _id: string;
  name: string;
  price: number;
  capacity: number;
  color: string;
  benefits: string[];
}

interface TableItem {
  _id: string;
  number: number;
  label: string;
  status: string;
  sectorLabel: string;
  categoryId: Category | string;
  position3D: { x: number; y: number; z: number; rotation: number };
}

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  sold: 'Vendida',
  blocked: 'Bloqueada',
};

const statusColors: Record<string, string> = {
  available: 'bg-green-500/20 text-green-400 border-green-500/30',
  reserved: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  sold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TablesManagementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '',
    price: 0,
    capacity: 4,
    color: '#a855f7',
    benefits: [] as string[],
  });
  const [catBenefitInput, setCatBenefitInput] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  // Batch add dialog
  const [batchDialog, setBatchDialog] = useState(false);
  const [batchForm, setBatchForm] = useState({
    count: 1,
    categoryId: '',
    sectorLabel: 'General',
    startNumber: 1,
  });
  const [savingBatch, setSavingBatch] = useState(false);

  // Selected tables
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, tableRes] = await Promise.all([
        fetch(`/api/events/${id}/categories`),
        fetch(`/api/events/${id}/tables`),
      ]);

      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.data);
      }

      const tableData = await tableRes.json();
      if (tableData.success) {
        setTables(tableData.data.tables || []);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const handleCreateCategory = async () => {
    if (!catForm.name || catForm.price < 0) return;

    try {
      setSavingCat(true);
      const res = await fetch(`/api/events/${id}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm),
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: 'Categoria creada exitosamente' });
        setCatDialog(false);
        setCatForm({
          name: '',
          price: 0,
          capacity: 4,
          color: '#a855f7',
          benefits: [],
        });
        fetchData();
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
        description: 'No se pudo crear la categoria',
        variant: 'destructive',
      });
    } finally {
      setSavingCat(false);
    }
  };

  const handleBatchCreate = async () => {
    if (!batchForm.categoryId || batchForm.count < 1) return;

    try {
      setSavingBatch(true);
      const tablesToCreate = Array.from({ length: batchForm.count }, (_, i) => ({
        categoryId: batchForm.categoryId,
        number: batchForm.startNumber + i,
        label: `Mesa ${batchForm.startNumber + i}`,
        sectorLabel: batchForm.sectorLabel,
        position3D: {
          x: (i % 5) * 2 - 4,
          y: 0,
          z: Math.floor(i / 5) * 2 - 2,
          rotation: 0,
        },
        status: 'available',
      }));

      const res = await fetch(`/api/events/${id}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: tablesToCreate }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: `${batchForm.count} mesas creadas exitosamente`,
        });
        setBatchDialog(false);
        setBatchForm({
          count: 1,
          categoryId: '',
          sectorLabel: 'General',
          startNumber: 1,
        });
        fetchData();
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
        description: 'No se pudieron crear las mesas',
        variant: 'destructive',
      });
    } finally {
      setSavingBatch(false);
    }
  };

  const handleBatchStatusChange = async (status: string) => {
    if (selectedTables.size === 0) return;

    try {
      const updates = Array.from(selectedTables).map((tableId) =>
        fetch(`/api/tables/${tableId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      );

      await Promise.all(updates);
      toast({
        title: `${selectedTables.size} mesas actualizadas`,
      });
      setSelectedTables(new Set());
      fetchData();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar las mesas',
        variant: 'destructive',
      });
    }
  };

  const toggleSelect = (tableId: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTables.size === filteredTables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(filteredTables.map((t) => t._id)));
    }
  };

  // Filter tables
  const filteredTables = tables.filter((t) => {
    if (categoryFilter !== 'all') {
      const catId =
        typeof t.categoryId === 'object'
          ? (t.categoryId as Category)._id
          : t.categoryId;
      if (catId !== categoryFilter) return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (
      search &&
      !t.label.toLowerCase().includes(search.toLowerCase()) &&
      !t.number.toString().includes(search) &&
      !t.sectorLabel.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getCategoryForTable = (table: TableItem): Category | undefined => {
    if (typeof table.categoryId === 'object') return table.categoryId as Category;
    return categories.find((c) => c._id === table.categoryId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-96 bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-white">
            Mesas y Categorias
          </h1>
          <p className="text-sm text-white/50">
            {tables.length} mesas en {categories.length} categorias
          </p>
        </div>
      </div>

      {/* ===== CATEGORIES SECTION ===== */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Categorias</h2>
          <Button
            onClick={() => setCatDialog(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500"
          >
            <Plus className="mr-1 h-4 w-4" />
            Nueva Categoria
          </Button>
        </div>

        {categories.length === 0 ? (
          <Card className="border-white/10 bg-[#111128]/80">
            <CardContent className="flex h-32 items-center justify-center">
              <div className="text-center">
                <LayoutGrid className="mx-auto mb-2 h-8 w-8 text-white/20" />
                <p className="text-sm text-white/40">
                  No hay categorias. Crea una para empezar.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const tableCount = tables.filter((t) => {
                const catId =
                  typeof t.categoryId === 'object'
                    ? (t.categoryId as Category)._id
                    : t.categoryId;
                return catId === cat._id;
              }).length;

              return (
                <motion.div
                  key={cat._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-white/10 bg-[#111128]/80">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded-full ring-2 ring-white/10"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div>
                            <h3 className="font-medium text-white">
                              {cat.name}
                            </h3>
                            <p className="text-xs text-white/40">
                              {formatCurrency(cat.price)} - {cat.capacity}{' '}
                              personas
                            </p>
                          </div>
                        </div>
                        <Badge className="border-white/10 bg-white/5 text-white/50">
                          {tableCount} mesas
                        </Badge>
                      </div>
                      {cat.benefits.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {cat.benefits.slice(0, 3).map((b, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40"
                            >
                              {b}
                            </span>
                          ))}
                          {cat.benefits.length > 3 && (
                            <span className="text-[10px] text-white/30">
                              +{cat.benefits.length - 3} mas
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Separator className="bg-white/10" />

      {/* ===== TABLES SECTION ===== */}
      <div>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Mesas</h2>
          <div className="flex gap-2">
            {selectedTables.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchStatusChange('blocked')}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Lock className="mr-1 h-3 w-3" />
                  Bloquear ({selectedTables.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchStatusChange('available')}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  <Unlock className="mr-1 h-3 w-3" />
                  Desbloquear ({selectedTables.size})
                </Button>
              </>
            )}
            <Button
              onClick={() => setBatchDialog(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              disabled={categories.length === 0}
            >
              <Plus className="mr-1 h-4 w-4" />
              Agregar Mesas
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4 border-white/10 bg-[#111128]/80">
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Buscar mesa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/30"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-sm text-white sm:w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#1a1a3e]">
                <SelectItem value="all" className="text-white/70 focus:bg-white/10 focus:text-white">
                  Todas
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem
                    key={cat._id}
                    value={cat._id}
                    className="text-white/70 focus:bg-white/10 focus:text-white"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full border-white/10 bg-white/5 text-sm text-white sm:w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#1a1a3e]">
                <SelectItem value="all" className="text-white/70 focus:bg-white/10 focus:text-white">
                  Todos
                </SelectItem>
                <SelectItem value="available" className="text-white/70 focus:bg-white/10 focus:text-white">
                  Disponible
                </SelectItem>
                <SelectItem value="reserved" className="text-white/70 focus:bg-white/10 focus:text-white">
                  Reservada
                </SelectItem>
                <SelectItem value="sold" className="text-white/70 focus:bg-white/10 focus:text-white">
                  Vendida
                </SelectItem>
                <SelectItem value="blocked" className="text-white/70 focus:bg-white/10 focus:text-white">
                  Bloqueada
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tables List */}
        <Card className="border-white/10 bg-[#111128]/80">
          <CardContent className="p-0">
            {filteredTables.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <div className="text-center">
                  <Table2 className="mx-auto mb-2 h-8 w-8 text-white/20" />
                  <p className="text-sm text-white/40">No hay mesas</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedTables.size === filteredTables.length &&
                            filteredTables.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-white/20 bg-white/5"
                        />
                      </TableHead>
                      <TableHead className="text-white/50">#</TableHead>
                      <TableHead className="text-white/50">
                        Etiqueta
                      </TableHead>
                      <TableHead className="text-white/50">
                        Categoria
                      </TableHead>
                      <TableHead className="text-white/50">Sector</TableHead>
                      <TableHead className="text-white/50">Estado</TableHead>
                      <TableHead className="text-white/50">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTables.map((table) => {
                      const cat = getCategoryForTable(table);
                      return (
                        <TableRow
                          key={table._id}
                          className={`border-white/5 hover:bg-white/[0.02] ${
                            selectedTables.has(table._id) ? 'bg-purple-500/5' : ''
                          }`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedTables.has(table._id)}
                              onChange={() => toggleSelect(table._id)}
                              className="h-4 w-4 rounded border-white/20 bg-white/5"
                            />
                          </TableCell>
                          <TableCell className="font-medium text-white/70">
                            {table.number}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {table.label}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {cat && (
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                              )}
                              <span className="text-sm text-white/60">
                                {cat?.name || '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-white/50">
                            {table.sectorLabel}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`border text-xs ${statusColors[table.status] || ''}`}
                            >
                              {statusLabels[table.status] || table.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-white/60">
                            {cat ? formatCurrency(cat.price) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="border-white/10 bg-[#111128]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Nueva Categoria
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Nombre</Label>
              <Input
                value={catForm.name}
                onChange={(e) =>
                  setCatForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej: VIP Gold"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Precio</Label>
                <Input
                  type="number"
                  value={catForm.price || ''}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      price: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="border-white/10 bg-white/5 text-white"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Capacidad</Label>
                <Input
                  type="number"
                  value={catForm.capacity || ''}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      capacity: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="border-white/10 bg-white/5 text-white"
                  min={1}
                  max={50}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={catForm.color}
                  onChange={(e) =>
                    setCatForm((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent"
                />
                <Input
                  value={catForm.color}
                  onChange={(e) =>
                    setCatForm((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Beneficios</Label>
              <div className="flex gap-2">
                <Input
                  value={catBenefitInput}
                  onChange={(e) => setCatBenefitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && catBenefitInput.trim()) {
                      e.preventDefault();
                      setCatForm((prev) => ({
                        ...prev,
                        benefits: [...prev.benefits, catBenefitInput.trim()],
                      }));
                      setCatBenefitInput('');
                    }
                  }}
                  placeholder="Agregar beneficio y Enter"
                  className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30"
                />
              </div>
              {catForm.benefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {catForm.benefits.map((b, i) => (
                    <Badge
                      key={i}
                      className="border-purple-500/30 bg-purple-500/10 text-xs text-purple-300"
                    >
                      {b}
                      <button
                        onClick={() =>
                          setCatForm((prev) => ({
                            ...prev,
                            benefits: prev.benefits.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="ml-1 hover:text-white"
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setCatDialog(false)}
                className="border-white/10 text-white/60"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={savingCat || !catForm.name}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {savingCat ? 'Creando...' : 'Crear Categoria'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Add Tables Dialog */}
      <Dialog open={batchDialog} onOpenChange={setBatchDialog}>
        <DialogContent className="border-white/10 bg-[#111128]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Agregar Mesas en Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Categoria</Label>
              <Select
                value={batchForm.categoryId}
                onValueChange={(v) =>
                  setBatchForm((prev) => ({ ...prev, categoryId: v }))
                }
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1a3e]">
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat._id}
                      value={cat._id}
                      className="text-white/70 focus:bg-white/10 focus:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name} ({formatCurrency(cat.price)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Cantidad</Label>
                <Input
                  type="number"
                  value={batchForm.count}
                  onChange={(e) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      count: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="border-white/10 bg-white/5 text-white"
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Numero Inicial</Label>
                <Input
                  type="number"
                  value={batchForm.startNumber}
                  onChange={(e) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      startNumber: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="border-white/10 bg-white/5 text-white"
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Sector</Label>
              <Input
                value={batchForm.sectorLabel}
                onChange={(e) =>
                  setBatchForm((prev) => ({
                    ...prev,
                    sectorLabel: e.target.value,
                  }))
                }
                placeholder="Ej: Planta Baja"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setBatchDialog(false)}
                className="border-white/10 text-white/60"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBatchCreate}
                disabled={savingBatch || !batchForm.categoryId}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              >
                {savingBatch
                  ? 'Creando...'
                  : `Crear ${batchForm.count} Mesas`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
