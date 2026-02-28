'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  X,
  Sparkles,
  Eye,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useReservationStore } from '@/store/reservation-store';
import { getPusherClient, channels, pusherEvents } from '@/lib/pusher';
import type { VenueMapTable } from '@/components/3d/VenueMap';
import type { TableCategoryInfo, EventSummary, TableWithCategory } from '@/types';

// Dynamically import VenueMap with SSR disabled (uses Three.js)
const VenueMap = dynamic(
  () => import('@/components/3d/VenueMap').then((mod) => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a1a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-white/40">Cargando mapa 3D...</p>
        </div>
      </div>
    ),
  }
);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDateSpanish(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeSpanish(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const eventId = params.id as string;

  // State
  const [event, setEvent] = useState<any>(null);
  const [tables, setTables] = useState<VenueMapTable[]>([]);
  const [categories, setCategories] = useState<TableCategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<VenueMapTable | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  // Store
  const { selectTable: storeSelectTable } = useReservationStore();

  // Promoter tracking
  const promoterRef = searchParams.get('ref');

  useEffect(() => {
    if (promoterRef) {
      sessionStorage.setItem(`promoter_${eventId}`, promoterRef);
    }
  }, [promoterRef, eventId]);

  // ─── Fetch event data ───────────────────────
  const fetchEventData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, tablesRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/tables`),
      ]);

      const eventJson = await eventRes.json();
      const tablesJson = await tablesRes.json();

      if (!eventJson.success) {
        setError(eventJson.error || 'Error cargando el evento');
        return;
      }

      setEvent(eventJson.data);
      setCategories(
        (eventJson.data.tableCategories || []).map((c: any) => ({
          id: c._id,
          name: c.name,
          price: c.price,
          capacity: c.capacity,
          color: c.color,
          benefits: c.benefits || [],
          position3D: c.position3D || { x: 0, y: 0, z: 0 },
          icon: c.icon,
        }))
      );

      if (tablesJson.success) {
        const mappedTables: VenueMapTable[] = (tablesJson.data.tables || []).map(
          (t: any) => ({
            id: t._id,
            number: t.number,
            label: t.label,
            status: t.status,
            position3D: t.position3D,
            categoryId: t.categoryId?._id || t.categoryId,
            category: t.categoryId
              ? {
                  id: t.categoryId._id || t.categoryId,
                  name: t.categoryId.name || 'General',
                  price: t.categoryId.price || 0,
                  capacity: t.categoryId.capacity || 4,
                  color: t.categoryId.color || '#6b7280',
                  benefits: t.categoryId.benefits || [],
                }
              : undefined,
          })
        );
        setTables(mappedTables);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('Error de conexion al cargar el evento');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) fetchEventData();
  }, [eventId, fetchEventData]);

  // ─── Pusher real-time updates ───────────────
  useEffect(() => {
    if (!eventId) return;

    let pusher: any;
    try {
      pusher = getPusherClient();
      const channel = pusher.subscribe(channels.eventTables(eventId));

      channel.bind(
        pusherEvents.TABLE_STATUS_CHANGED,
        (data: { tableId: string; status: string }) => {
          setTables((prev) =>
            prev.map((t) =>
              t.id === data.tableId ? { ...t, status: data.status as any } : t
            )
          );
        }
      );

      return () => {
        channel.unbind_all();
        pusher.unsubscribe(channels.eventTables(eventId));
      };
    } catch {
      // Pusher not configured, skip real-time updates
    }
  }, [eventId]);

  // ─── Table selection handler ────────────────
  const handleTableSelect = useCallback(
    (table: VenueMapTable) => {
      if (table.status !== 'available') return;
      setSelectedTable(table);
      setShowPanel(true);
    },
    []
  );

  // ─── Reserve handler ───────────────────────
  const handleReserve = useCallback(() => {
    if (!selectedTable || !event) return;

    const eventSummary: EventSummary = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      endDate: event.endDate,
      status: event.status,
      coverImage: event.coverImage,
      tags: event.tags,
      ticketPrice: event.ticketPrice,
      venue: {
        id: event.venue?._id || '',
        name: event.venue?.name || '',
        address: event.venue?.address || '',
      },
    };

    const tableWithCategory: TableWithCategory = {
      id: selectedTable.id,
      eventId: event._id,
      categoryId: selectedTable.categoryId,
      number: selectedTable.number,
      label: selectedTable.label,
      status: selectedTable.status,
      position3D: selectedTable.position3D,
      sectorLabel: '',
      category: selectedTable.category
        ? {
            id: selectedTable.category.id,
            name: selectedTable.category.name,
            price: selectedTable.category.price,
            capacity: selectedTable.category.capacity,
            color: selectedTable.category.color,
            benefits: selectedTable.category.benefits,
            position3D: { x: 0, y: 0, z: 0 },
          }
        : {
            id: '',
            name: 'General',
            price: 0,
            capacity: 4,
            color: '#6b7280',
            benefits: [],
            position3D: { x: 0, y: 0, z: 0 },
          },
    };

    storeSelectTable(tableWithCategory, eventSummary);

    if (!session) {
      router.push(`/login?callbackUrl=/events/${eventId}/checkout`);
      return;
    }

    router.push(`/events/${eventId}/checkout`);
  }, [selectedTable, event, session, router, eventId, storeSelectTable]);

  // ─── Computed values ────────────────────────
  const availableCount = useMemo(
    () => tables.filter((t) => t.status === 'available').length,
    [tables]
  );

  // ─── Loading state ──────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="h-8 w-48 bg-white/5 mb-6" />
          <Skeleton className="h-64 w-full bg-white/5 rounded-xl mb-6" />
          <Skeleton className="h-[500px] w-full bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────
  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white/60 mb-2">
            {error || 'Evento no encontrado'}
          </h2>
          <p className="text-white/40 mb-6">
            No pudimos cargar la informacion del evento
          </p>
          <Link href="/events">
            <Button className="bg-purple-600 hover:bg-purple-500">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Eventos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          {event.coverImage ? (
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className="object-cover opacity-20 blur-sm"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-900/30 to-pink-900/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/50 via-[#0a0a1a]/80 to-[#0a0a1a]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back button */}
          <Link href="/events" className="inline-block mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Eventos
            </Button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="flex-1">
              {/* Status badge */}
              <Badge
                variant="outline"
                className={`mb-3 ${
                  event.status === 'active'
                    ? 'border-green-500/30 text-green-400 bg-green-500/10'
                    : event.status === 'sold_out'
                    ? 'border-red-500/30 text-red-400 bg-red-500/10'
                    : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                }`}
              >
                {event.status === 'active'
                  ? 'Venta Activa'
                  : event.status === 'sold_out'
                  ? 'Agotado'
                  : event.status === 'draft'
                  ? 'Proximamente'
                  : 'Finalizado'}
              </Badge>

              <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl mb-4">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-white/60">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span className="text-sm capitalize">
                    {formatDateSpanish(event.date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-pink-400" />
                  <span className="text-sm">
                    {formatTimeSpanish(event.date)} - {formatTimeSpanish(event.endDate)}
                  </span>
                </div>
                {event.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">{event.venue.name}</span>
                  </div>
                )}
              </div>

              {event.description && (
                <p className="mt-4 text-sm text-white/40 max-w-2xl line-clamp-3">
                  {event.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center min-w-[100px]">
                <p className="text-2xl font-bold text-green-400">
                  {availableCount}
                </p>
                <p className="text-xs text-white/40">Disponibles</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center min-w-[100px]">
                <p className="text-2xl font-bold text-white/60">
                  {tables.length}
                </p>
                <p className="text-xs text-white/40">Total mesas</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3D Map Section */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Category Legend */}
          {categories.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Categorias:
              </span>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs text-white/70">{cat.name}</span>
                  <span className="text-xs font-semibold text-purple-400">
                    ${cat.price.toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Map Container */}
          <div className="relative rounded-2xl border border-white/5 overflow-hidden neon-glow">
            <div className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px]">
              {tables.length > 0 ? (
                <VenueMap
                  tables={tables}
                  onTableSelect={handleTableSelect}
                  selectedTableId={selectedTable?.id || null}
                  mode="view"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#0a0a1a]">
                  <div className="text-center">
                    <Eye className="mx-auto h-12 w-12 text-white/10 mb-3" />
                    <p className="text-white/40">
                      No hay mesas configuradas para este evento
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile-friendly instruction */}
          <p className="mt-3 text-center text-xs text-white/30">
            Toca una mesa disponible para ver detalles y reservar
          </p>
        </motion.div>
      </section>

      {/* Selection Panel - Desktop: side panel, Mobile: bottom sheet */}
      {/* Desktop Selection Panel */}
      <AnimatePresence>
        {selectedTable && showPanel && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-16 bottom-0 z-40 hidden lg:block w-96 border-l border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl overflow-y-auto"
          >
            <div className="p-6">
              {/* Close */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">
                  Mesa Seleccionada
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/40 hover:text-white"
                  onClick={() => {
                    setShowPanel(false);
                    setSelectedTable(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Table info */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      Mesa {selectedTable.number}
                    </p>
                    <p className="text-sm text-white/50">{selectedTable.label}</p>
                  </div>
                  {selectedTable.category && (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: selectedTable.category.color + '20',
                        borderColor: selectedTable.category.color + '40',
                        borderWidth: 1,
                      }}
                    >
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: selectedTable.category.color }}
                      />
                    </div>
                  )}
                </div>

                <Separator className="bg-white/10 mb-4" />

                {selectedTable.category && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">Categoria</span>
                        <span className="text-sm font-medium text-white">
                          {selectedTable.category.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">Capacidad</span>
                        <span className="text-sm font-medium text-white">
                          {selectedTable.category.capacity} personas
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">Precio</span>
                        <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                          ${selectedTable.category.price.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>

                    {/* Benefits */}
                    {selectedTable.category.benefits &&
                      selectedTable.category.benefits.length > 0 && (
                        <>
                          <Separator className="bg-white/10 my-4" />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                              Incluye
                            </p>
                            <ul className="space-y-2">
                              {selectedTable.category.benefits.map(
                                (benefit, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-white/60"
                                  >
                                    <Sparkles className="mt-0.5 h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                                    {benefit}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </>
                      )}
                  </>
                )}
              </div>

              {/* Reserve button */}
              {event.status === 'active' && (
                <Button
                  onClick={handleReserve}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow"
                >
                  Reservar Mesa
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Selection Sheet */}
      <Sheet
        open={showPanel && !!selectedTable}
        onOpenChange={(open) => {
          if (!open) {
            setShowPanel(false);
            setSelectedTable(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="lg:hidden bg-[#0a0a1a] border-white/10 rounded-t-2xl max-h-[70vh] overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white text-left">
              Mesa Seleccionada
            </SheetTitle>
          </SheetHeader>

          {selectedTable && (
            <div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xl font-bold text-white">
                      Mesa {selectedTable.number}
                    </p>
                    <p className="text-sm text-white/50">{selectedTable.label}</p>
                  </div>
                  {selectedTable.category && (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: selectedTable.category.color + '20',
                      }}
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: selectedTable.category.color }}
                      />
                    </div>
                  )}
                </div>

                {selectedTable.category && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center rounded-lg bg-white/5 p-2">
                      <p className="text-xs text-white/40">Categoria</p>
                      <p className="text-sm font-medium text-white">
                        {selectedTable.category.name}
                      </p>
                    </div>
                    <div className="text-center rounded-lg bg-white/5 p-2">
                      <p className="text-xs text-white/40">Capacidad</p>
                      <p className="text-sm font-medium text-white">
                        {selectedTable.category.capacity}
                      </p>
                    </div>
                    <div className="text-center rounded-lg bg-white/5 p-2">
                      <p className="text-xs text-white/40">Precio</p>
                      <p className="text-sm font-bold text-purple-400">
                        ${selectedTable.category.price.toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                )}

                {selectedTable.category?.benefits &&
                  selectedTable.category.benefits.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {selectedTable.category.benefits.map((b, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-300"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {event.status === 'active' && (
                <Button
                  onClick={handleReserve}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow"
                >
                  Reservar Mesa
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
