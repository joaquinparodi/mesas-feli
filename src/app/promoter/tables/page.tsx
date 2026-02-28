'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  TableProperties,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface PromoterEvent {
  _id: string;
  promoterId: string;
  referralToken: string;
  commissionRate: number;
  isActive: boolean;
  assignedTables: string[];
  event: {
    _id: string;
    title: string;
    date: string;
    status: string;
  };
  tables: Array<{
    _id: string;
    number: number;
    label: string;
    status: string;
    sectorLabel: string;
    category?: {
      name: string;
      color: string;
      price: number;
      capacity: number;
    };
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTableStatusConfig(status: string) {
  switch (status) {
    case 'available':
      return { label: 'Disponible', className: 'bg-green-500/20 text-green-400 border-green-500/30', dot: 'bg-green-400' };
    case 'reserved':
      return { label: 'Reservada', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' };
    case 'sold':
      return { label: 'Vendida', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' };
    case 'blocked':
      return { label: 'Bloqueada', className: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-400' };
    default:
      return { label: status, className: 'bg-gray-500/20 text-gray-400', dot: 'bg-gray-400' };
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function PromoterTablesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [promoterEvents, setPromoterEvents] = useState<PromoterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      // Fetch promoter records
      const res = await fetch('/api/promoters');
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success || !data.data?.items) return;

      // Filter for current user's promoter records
      const myPromoters = data.data.items.filter(
        (p: any) => {
          const userId = p.userId?._id || p.userId;
          return userId === session.user.id || userId?.toString() === session.user.id;
        }
      );

      // Fetch tables for each event
      const enriched: PromoterEvent[] = await Promise.all(
        myPromoters.map(async (promoter: any) => {
          const eventId = promoter.eventId?._id || promoter.eventId;
          let tables: any[] = [];

          try {
            const tablesRes = await fetch(`/api/events/${eventId}/tables`);
            if (tablesRes.ok) {
              const tablesData = await tablesRes.json();
              if (tablesData.success) {
                // Filter to only assigned tables if any
                const allTables = tablesData.data || [];
                if (promoter.assignedTables && promoter.assignedTables.length > 0) {
                  tables = allTables.filter((t: any) =>
                    promoter.assignedTables.includes(t._id?.toString())
                  );
                  // If no match, show all (might be populated differently)
                  if (tables.length === 0) tables = allTables;
                } else {
                  tables = allTables;
                }
              }
            }
          } catch {
            // silently fail
          }

          return {
            _id: promoter._id,
            promoterId: promoter._id,
            referralToken: promoter.referralToken,
            commissionRate: promoter.commissionRate,
            isActive: promoter.isActive,
            assignedTables: promoter.assignedTables || [],
            event: {
              _id: eventId,
              title: promoter.eventId?.title || 'Evento',
              date: promoter.eventId?.date || '',
              status: promoter.eventId?.status || 'active',
            },
            tables,
          };
        })
      );

      setPromoterEvents(enriched);

      // Auto-expand first event
      if (enriched.length > 0) {
        setExpandedEvents(new Set([enriched[0]._id]));
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyLink = async (token: string, eventId: string) => {
    const link = `${window.location.origin}/promoter/link/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(eventId);
      toast({ title: 'Link copiado al portapapeles' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.alert('Link: ' + link);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/5" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64 bg-white/5" />
        ))}
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
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white md:text-3xl">Mis Mesas</h1>
        <p className="text-sm text-white/50">
          Mesas asignadas por evento y su estado actual
        </p>
      </motion.div>

      {promoterEvents.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-white/5 bg-[#111128]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <TableProperties className="mb-4 h-16 w-16 text-white/10" />
              <p className="text-lg font-medium text-white/40">
                No tienes mesas asignadas
              </p>
              <p className="mt-1 text-sm text-white/30">
                Contacta al organizador para que te asigne mesas
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        promoterEvents.map((pe) => {
          const isExpanded = expandedEvents.has(pe._id);
          const availableCount = pe.tables.filter((t) => t.status === 'available').length;
          const soldCount = pe.tables.filter((t) => t.status === 'sold' || t.status === 'reserved').length;
          const totalCount = pe.tables.length;

          return (
            <motion.div key={pe._id} variants={itemVariants}>
              <Card className="border-white/5 bg-[#111128] overflow-hidden">
                {/* Event Header */}
                <CardHeader
                  className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleExpanded(pe._id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg text-white">
                          {pe.event.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            pe.event.status === 'active'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }
                        >
                          {pe.event.status === 'active' ? 'Activo' : pe.event.status}
                        </Badge>
                      </div>
                      {pe.event.date && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                          <Clock className="h-3 w-3" />
                          {formatDate(pe.event.date)}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-400" />
                          {availableCount} disponibles
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-purple-400" />
                          {soldCount} vendidas
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {totalCount} total
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(pe.referralToken, pe.event._id);
                        }}
                        className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                      >
                        {copiedId === pe.event._id ? (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {copiedId === pe.event._id ? 'Copiado' : 'Link'}
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-white/30" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-white/30" />
                      )}
                    </div>
                  </div>

                  {/* Availability bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="flex h-full">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${totalCount > 0 ? (soldCount / totalCount) * 100 : 0}%` }}
                        />
                        <div
                          className="bg-green-500/50 transition-all duration-500"
                          style={{ width: `${totalCount > 0 ? (availableCount / totalCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Tables List */}
                {isExpanded && (
                  <CardContent className="border-t border-white/5 pt-4">
                    {pe.tables.length === 0 ? (
                      <p className="py-8 text-center text-sm text-white/30">
                        No hay mesas cargadas para este evento
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pe.tables.map((table) => {
                          const statusConfig = getTableStatusConfig(table.status);
                          return (
                            <div
                              key={table._id}
                              className="rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white">
                                      Mesa {table.number}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${statusConfig.className}`}
                                    >
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                  <p className="mt-0.5 text-xs text-white/40">{table.label}</p>
                                </div>
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: table.category?.color || '#6b7280' }}
                                />
                              </div>
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50">
                                {table.category && (
                                  <>
                                    <span>{table.category.name}</span>
                                    <span>{formatCurrency(table.category.price)}</span>
                                    <span>{table.category.capacity} personas</span>
                                  </>
                                )}
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {table.sectorLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Event link */}
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.open(`/events/${pe.event._id}?ref=${pe.referralToken}`, '_blank');
                        }}
                        className="text-xs text-pink-400 hover:text-pink-300"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Ver evento completo
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}
