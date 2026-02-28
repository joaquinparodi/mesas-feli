'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EventFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  onClear: () => void;
}

export default function EventFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  onClear,
}: EventFiltersProps) {
  const hasFilters = search || status !== 'all' || sortBy !== 'date-asc';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Buscar eventos..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
        />
      </div>

      {/* Status Filter */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
          <Filter className="mr-2 h-3.5 w-3.5 text-white/40" />
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent className="bg-[#111128] border-white/10">
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Disponibles</SelectItem>
          <SelectItem value="sold_out">Agotados</SelectItem>
          <SelectItem value="draft">Proximamente</SelectItem>
          <SelectItem value="finished">Finalizados</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent className="bg-[#111128] border-white/10">
          <SelectItem value="date-asc">Fecha (prox.)</SelectItem>
          <SelectItem value="date-desc">Fecha (ult.)</SelectItem>
          <SelectItem value="title-asc">Nombre A-Z</SelectItem>
          <SelectItem value="title-desc">Nombre Z-A</SelectItem>
          <SelectItem value="createdAt-desc">Mas recientes</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-white/50 hover:text-white hover:bg-white/5"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
