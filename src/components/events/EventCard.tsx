'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: {
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
    availableTables?: number;
    totalTables?: number;
  };
}

function formatDateSpanish(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString('es-AR', options);
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return {
        label: 'Disponible',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
      };
    case 'sold_out':
      return {
        label: 'Agotado',
        className: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
    case 'draft':
      return {
        label: 'Proximamente',
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      };
    case 'finished':
      return {
        label: 'Finalizado',
        className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      };
    default:
      return {
        label: status,
        className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      };
  }
}

export default function EventCard({ event }: EventCardProps) {
  const statusConfig = getStatusConfig(event.status);

  return (
    <Link href={`/events/${event._id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#111128] transition-all duration-300 hover:border-purple-500/30 hover:neon-glow cursor-pointer"
      >
        {/* Cover Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {event.coverImage ? (
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
              <Calendar className="h-12 w-12 text-white/20" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111128] via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <Badge
              variant="outline"
              className={`text-xs font-medium ${statusConfig.className}`}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* Price badge */}
          {event.ticketPrice != null && event.ticketPrice > 0 && (
            <div className="absolute bottom-3 right-3">
              <div className="rounded-lg bg-gradient-to-r from-purple-600/90 to-pink-600/90 px-3 py-1 backdrop-blur-sm">
                <span className="text-sm font-bold text-white">
                  ${event.ticketPrice.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 text-lg font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
            {event.title}
          </h3>

          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
              <span className="truncate">{formatDateSpanish(event.date)}</span>
            </div>

            {event.venue && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
                <span className="truncate">{event.venue.name}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {event.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40"
                >
                  {tag}
                </span>
              ))}
              {event.tags.length > 3 && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                  +{event.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Availability */}
          {event.availableTables != null && event.totalTables != null && (
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-green-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/50">
                    {event.availableTables} mesas disponibles
                  </span>
                  <span className="text-white/30">
                    {event.totalTables} total
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${
                        event.totalTables > 0
                          ? (event.availableTables / event.totalTables) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
