'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Calendar as CalendarIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Venue {
  _id: string;
  name: string;
  address: string;
  capacity: number;
}

export default function NewEventPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    date: '',
    endDate: '',
    status: 'draft',
    coverImage: '',
    tags: [] as string[],
    ticketPrice: 0,
  });

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchVenues() {
      try {
        // Venues are typically fetched via an API; try direct event creation page
        const res = await fetch('/api/events?limit=1');
        const data = await res.json();
        // For now, we'll provide a way to input venue ID
        // or fetch from a venues endpoint if it exists
      } catch {
        // Silently fail
      } finally {
        setLoadingVenues(false);
      }
    }
    fetchVenues();
  }, []);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setForm((prev) => ({ ...prev, coverImage: data.data.url }));
        toast({ title: 'Imagen subida correctamente' });
      } else {
        toast({
          title: 'Error al subir imagen',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo subir la imagen',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.description || !form.venue || !form.date || !form.endDate) {
      toast({
        title: 'Campos requeridos',
        description: 'Completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const body: Record<string, any> = {
        title: form.title,
        description: form.description,
        venue: form.venue,
        date: new Date(form.date).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        status: form.status,
        tags: form.tags,
      };

      if (form.coverImage) {
        body.coverImage = form.coverImage;
      }
      if (form.ticketPrice > 0) {
        body.ticketPrice = form.ticketPrice;
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: 'Evento creado exitosamente' });
        router.push(`/dashboard/events/${data.data._id}/layout`);
      } else {
        toast({
          title: 'Error al crear evento',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Error inesperado al crear el evento',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-white/50 hover:text-white"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Crear Nuevo Evento</h1>
          <p className="text-sm text-white/50">
            Completa la informacion de tu evento
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Basic Info */}
          <Card className="border-white/10 bg-[#111128]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Informacion Basica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white/70">
                  Titulo del Evento *
                </Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Ej: Fiesta Neon - Sabado"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white/70">
                  Descripcion *
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe tu evento..."
                  rows={4}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-white/70">
                    Fecha de Inicio *
                  </Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={form.date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-white/70">
                    Fecha de Fin *
                  </Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="border-white/10 bg-white/5 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue" className="text-white/70">
                  ID del Venue *
                </Label>
                <Input
                  id="venue"
                  value={form.venue}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, venue: e.target.value }))
                  }
                  placeholder="ID del venue (MongoDB ObjectId)"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  required
                />
                <p className="text-xs text-white/30">
                  Ingresa el ID del venue existente o crea uno nuevo primero
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cover Image */}
          <Card className="border-white/10 bg-[#111128]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Imagen de Portada
              </CardTitle>
            </CardHeader>
            <CardContent>
              {imagePreview || form.coverImage ? (
                <div className="relative">
                  <img
                    src={imagePreview || form.coverImage}
                    alt="Preview"
                    className="h-48 w-full rounded-lg object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImagePreview(null);
                      setForm((prev) => ({ ...prev, coverImage: '' }));
                    }}
                    className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/60 p-0 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] transition-colors hover:border-purple-500/30 hover:bg-white/[0.04]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex items-center gap-2 text-white/40">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                      <span className="text-sm">Subiendo...</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="mb-2 h-8 w-8 text-white/20" />
                      <p className="text-sm text-white/40">
                        Haz clic para subir una imagen
                      </p>
                      <p className="mt-1 text-xs text-white/20">
                        JPG, PNG o WebP. Max 5MB
                      </p>
                    </>
                  )}
                </label>
              )}

              {/* Manual URL input */}
              <div className="mt-3 space-y-2">
                <Label className="text-xs text-white/40">
                  O ingresa la URL directamente
                </Label>
                <Input
                  value={form.coverImage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      coverImage: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags & Settings */}
          <Card className="border-white/10 bg-[#111128]/80">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Etiquetas y Configuracion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-white/70">Etiquetas</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Agregar etiqueta..."
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    className="border-white/10 text-white/60"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="border-purple-500/30 bg-purple-500/20 text-purple-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1.5 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="bg-white/10" />

              {/* Status */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/70">Estado</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((prev) => ({ ...prev, status: v }))
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#1a1a3e]">
                      <SelectItem value="draft" className="text-white/70 focus:bg-white/10 focus:text-white">
                        Borrador
                      </SelectItem>
                      <SelectItem value="active" className="text-white/70 focus:bg-white/10 focus:text-white">
                        Activo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">
                    Precio de Entrada (opcional)
                  </Label>
                  <Input
                    type="number"
                    value={form.ticketPrice || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        ticketPrice: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                    min={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-white/10 text-white/60"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              {submitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creando...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Crear Evento
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
