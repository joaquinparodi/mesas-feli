'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EventCard from '@/components/events/EventCard';
import EventFilters from '@/components/events/EventFilters';

interface EventData {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  status: string;
  coverImage?: string;
  tags: string[];
  ticketPrice?: number;
  venue?: {
    _id: string;
    name: string;
    address: string;
  };
}

interface PaginatedResponse {
  items: EventData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function EventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'date-asc');
  const [page, setPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  );

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');

      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);

      const [sortField, sortOrder] = sortBy.split('-');
      params.set('sortBy', sortField);
      params.set('sortOrder', sortOrder || 'asc');

      const res = await fetch(`/api/events?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setEvents(json.data.items);
        setPagination({
          page: json.data.page,
          totalPages: json.data.totalPages,
          total: json.data.total,
          hasNext: json.data.hasNext,
          hasPrev: json.data.hasPrev,
        });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [search, status, sortBy, page]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchEvents();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchEvents]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setSortBy('date-asc');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Eventos
              </span>
            </h1>
            <p className="mt-3 text-lg text-white/50 max-w-2xl">
              Descubri los mejores eventos y reserva tu mesa VIP con nuestro
              mapa 3D interactivo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters + Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <EventFilters
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            status={status}
            onStatusChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            sortBy={sortBy}
            onSortByChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
            onClear={handleClearFilters}
          />
        </motion.div>

        {/* Results count */}
        {!loading && (
          <p className="mb-6 text-sm text-white/40">
            {pagination.total} evento{pagination.total !== 1 ? 's' : ''}{' '}
            encontrado{pagination.total !== 1 ? 's' : ''}
          </p>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-[#111128] overflow-hidden">
                <Skeleton className="aspect-[16/10] w-full bg-white/5" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4 bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-white/5" />
                  <Skeleton className="h-4 w-2/3 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Calendar className="h-16 w-16 text-white/10 mb-4" />
            <h3 className="text-xl font-semibold text-white/40">
              No se encontraron eventos
            </h3>
            <p className="mt-2 text-sm text-white/25">
              Intenta ajustar los filtros de busqueda
            </p>
            <Button
              variant="outline"
              className="mt-6 border-white/10 text-white/60 hover:bg-white/5"
              onClick={handleClearFilters}
            >
              Limpiar filtros
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {events.map((event, index) => (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - page) <= 1
                )
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-white/30">...</span>
                    )}
                    <Button
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={
                        p === page
                          ? 'bg-purple-600 hover:bg-purple-500 text-white border-0 min-w-[36px]'
                          : 'border-white/10 text-white/60 hover:bg-white/5 min-w-[36px]'
                      }
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              className="border-white/10 text-white/60 hover:bg-white/5 disabled:opacity-30"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
          <div className="animate-pulse text-white/30">Cargando eventos...</div>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
