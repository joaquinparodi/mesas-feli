'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowLeft, Info, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const LayoutEditor = dynamic(
  () =>
    import('@/components/3d/LayoutEditor').then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-xl border border-white/10 bg-[#0a0a1a]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-purple-500" />
          <p className="text-sm text-white/40">Cargando editor 3D...</p>
        </div>
      </div>
    ),
  }
);

interface LayoutData {
  eventId: string;
  title: string;
  layout3DConfig: Record<string, any>;
  venueLayout: Record<string, any>;
  tables: any[];
  categories: any[];
}

export default function LayoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [layoutData, setLayoutData] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLayout() {
      try {
        setLoading(true);
        const res = await fetch(`/api/events/${id}/layout`);
        const data = await res.json();

        if (data.success) {
          setLayoutData(data.data);
        } else {
          setError(data.error || 'Error al cargar layout');
        }
      } catch (err) {
        setError('Error de conexion al cargar layout');
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchLayout();
  }, [id]);

  const handleSave = useCallback(
    async (saveData: {
      tables: any[];
      categories: any[];
      sectors: any[];
    }) => {
      try {
        // Transform editor tables to API format
        const tablesToSave = saveData.tables.map((t) => ({
          _id: t.id,
          position3D: {
            x: t.position3D.x,
            y: t.position3D.y,
            z: t.position3D.z,
            rotation: t.position3D.rotation || 0,
          },
          sectorLabel: t.sectorLabel,
        }));

        const res = await fetch(`/api/events/${id}/layout`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tables: tablesToSave,
            layout3DConfig: layoutData?.layout3DConfig || {},
          }),
        });

        const data = await res.json();

        if (data.success) {
          toast({ title: 'Layout guardado exitosamente' });
        } else {
          throw new Error(data.error || 'Error al guardar');
        }
      } catch (err: any) {
        toast({
          title: 'Error al guardar',
          description: err.message,
          variant: 'destructive',
        });
        throw err;
      }
    },
    [id, layoutData, toast]
  );

  // Transform API data to editor format
  const getInitialData = () => {
    if (!layoutData) return undefined;

    const tables = layoutData.tables.map((t: any) => ({
      id: t._id,
      number: t.number,
      label: t.label,
      status: t.status,
      categoryId: t.categoryId?._id || t.categoryId,
      sectorLabel: t.sectorLabel || 'General',
      position3D: {
        x: t.position3D?.x || 0,
        y: t.position3D?.y || 0,
        z: t.position3D?.z || 0,
        rotation: t.position3D?.rotation || 0,
      },
    }));

    const categories = layoutData.categories.map((c: any) => ({
      id: c._id,
      name: c.name,
      color: c.color,
      price: c.price || 0,
      capacity: c.capacity || 4,
      benefits: c.benefits || [],
    }));

    return { tables, categories };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 bg-white/5" />
          <Skeleton className="h-8 w-64 bg-white/5" />
        </div>
        <Skeleton className="h-[calc(100vh-200px)] rounded-xl bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-400">{error}</p>
          <Button
            onClick={() => router.back()}
            className="mt-4"
            variant="outline"
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            <h1 className="text-xl font-bold text-white">
              Editor de Layout 3D
            </h1>
            <p className="text-xs text-white/40">
              {layoutData?.title || 'Evento'}
            </p>
          </div>
        </div>

        {/* Help text */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="flex items-center gap-2 px-4 py-2">
            <Info className="h-4 w-4 flex-shrink-0 text-blue-400" />
            <p className="text-xs text-blue-300/80">
              Arrastra mesas para reposicionar. Usa Ctrl+S para guardar. G
              para alternar la grilla.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Editor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-xl border border-white/10"
      >
        <LayoutEditor
          initialData={getInitialData()}
          onSave={handleSave}
          className="h-full w-full"
        />
      </motion.div>
    </div>
  );
}
