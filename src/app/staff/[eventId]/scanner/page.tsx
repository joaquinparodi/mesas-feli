'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  QrCode,
  Send,
  RotateCcw,
  User,
  TableProperties,
  Users,
  Shield,
  AlertTriangle,
  Loader2,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ScanResult {
  id: string;
  timestamp: Date;
  success: boolean;
  data?: {
    reservation: {
      _id: string;
      status: string;
      amount: number;
      guestCount: number;
      guestNames: string[];
      benefits: string[];
      notes?: string;
    };
    event: {
      _id: string;
      title: string;
      date: string;
      venue: any;
    };
    table: {
      _id: string;
      number: number;
      label: string;
      sectorLabel: string;
      category: {
        name: string;
        color: string;
        capacity: number;
      } | null;
    };
    user: {
      _id: string;
      name: string;
      email: string;
      phone?: string;
    };
  };
  error?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function QRScannerPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const _eventId = params.eventId as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      if (
        session?.user?.role === 'organizer' ||
        session?.user?.role === 'admin'
      ) {
        setAuthorized(true);
      } else {
        router.push('/');
      }
    }
  }, [status, session, router]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de camara denegado. Permite el acceso en la configuracion del navegador.'
          : err.name === 'NotFoundError'
          ? 'No se encontro una camara disponible.'
          : 'Error al acceder a la camara: ' + err.message
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const validateQR = useCallback(
    async (token: string) => {
      if (scanning || !token.trim()) return;

      setScanning(true);
      setCurrentResult(null);

      try {
        const res = await fetch('/api/qr/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.trim() }),
        });

        const data = await res.json();

        const result: ScanResult = {
          id: Date.now().toString(),
          timestamp: new Date(),
          success: data.success && data.data?.valid,
          data: data.success ? data.data : undefined,
          error: data.success ? undefined : data.error,
        };

        setCurrentResult(result);
        setScanHistory((prev) => [result, ...prev]);
      } catch {
        const result: ScanResult = {
          id: Date.now().toString(),
          timestamp: new Date(),
          success: false,
          error: 'Error de conexion. Verifica tu internet.',
        };
        setCurrentResult(result);
        setScanHistory((prev) => [result, ...prev]);
      } finally {
        setScanning(false);
      }
    },
    [scanning]
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      validateQR(manualInput.trim());
      setManualInput('');
    }
  };

  const resetResult = () => {
    setCurrentResult(null);
  };

  if (status === 'loading' || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-purple-400" />
          <p className="text-white/50">Verificando permisos...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
            <QrCode className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Scanner QR</h1>
          <p className="text-sm text-white/50">
            Escanea o ingresa el codigo QR de la reserva
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs text-green-400">
              {session?.user?.name} - {session?.user?.role === 'admin' ? 'Administrador' : 'Organizador'}
            </span>
          </div>
        </motion.div>

        {/* Camera Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-4 border-white/5 bg-[#111128] overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Camera className="h-4 w-4 text-purple-400" />
                Camara
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Camera viewport */}
              <div className="relative mb-4 overflow-hidden rounded-lg bg-black/50 aspect-[4/3]">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover"
                      playsInline
                      muted
                    />
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-48 w-48">
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 h-8 w-8 border-l-2 border-t-2 border-purple-500" />
                        <div className="absolute top-0 right-0 h-8 w-8 border-r-2 border-t-2 border-purple-500" />
                        <div className="absolute bottom-0 left-0 h-8 w-8 border-l-2 border-b-2 border-purple-500" />
                        <div className="absolute bottom-0 right-0 h-8 w-8 border-r-2 border-b-2 border-purple-500" />
                        {/* Scan line */}
                        <motion.div
                          animate={{ y: [0, 176, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
                    {cameraError ? (
                      <>
                        <CameraOff className="h-12 w-12 text-red-400/50" />
                        <p className="text-center text-sm text-red-400/80">{cameraError}</p>
                      </>
                    ) : (
                      <>
                        <Camera className="h-12 w-12 text-white/20" />
                        <p className="text-center text-sm text-white/40">
                          Activa la camara para escanear codigos QR
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Camera toggle */}
              <Button
                onClick={cameraActive ? stopCamera : startCamera}
                variant={cameraActive ? 'destructive' : 'default'}
                className={
                  cameraActive
                    ? 'w-full'
                    : 'w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0'
                }
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="mr-2 h-4 w-4" />
                    Desactivar Camara
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Activar Camara
                  </>
                )}
              </Button>

              <p className="mt-2 text-center text-xs text-white/30">
                La lectura automatica de QR requiere una libreria de decodificacion.
                Usa el campo manual para ingresar el codigo.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Manual Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-4 border-white/5 bg-[#111128]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <QrCode className="h-4 w-4 text-pink-400" />
                Ingreso Manual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Pegar codigo QR aqui..."
                  className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  disabled={scanning}
                />
                <Button
                  type="submit"
                  disabled={scanning || !manualInput.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0"
                >
                  {scanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Scan Result */}
        <AnimatePresence mode="wait">
          {currentResult && (
            <motion.div
              key={currentResult.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="mb-4"
            >
              <Card
                className={`border-2 overflow-hidden ${
                  currentResult.success
                    ? 'border-green-500/40 bg-green-900/10'
                    : 'border-red-500/40 bg-red-900/10'
                }`}
              >
                <CardContent className="p-5">
                  {/* Status icon */}
                  <div className="mb-4 flex items-center justify-center">
                    {currentResult.success ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                      >
                        <CheckCircle2 className="h-20 w-20 text-green-400" />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                      >
                        <XCircle className="h-20 w-20 text-red-400" />
                      </motion.div>
                    )}
                  </div>

                  <p className="mb-4 text-center text-xl font-bold text-white">
                    {currentResult.success ? 'QR Valido' : 'QR Invalido'}
                  </p>

                  {/* Success details */}
                  {currentResult.success && currentResult.data && (
                    <div className="space-y-3">
                      {/* Guest info */}
                      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                            <User className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {currentResult.data.user?.name || 'Invitado'}
                            </p>
                            <p className="text-xs text-white/50">
                              {currentResult.data.user?.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Table info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
                            <TableProperties className="h-3 w-3" />
                            Mesa
                          </div>
                          <p className="text-lg font-bold text-white">
                            #{currentResult.data.table?.number}
                          </p>
                          <p className="text-xs text-white/50">
                            {currentResult.data.table?.label}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
                            <Users className="h-3 w-3" />
                            Invitados
                          </div>
                          <p className="text-lg font-bold text-white">
                            {currentResult.data.reservation?.guestCount}
                          </p>
                          <p className="text-xs text-white/50">personas</p>
                        </div>
                      </div>

                      {/* Category & sector */}
                      <div className="flex flex-wrap gap-2">
                        {currentResult.data.table?.category && (
                          <Badge
                            className="border-0 text-white"
                            style={{ backgroundColor: currentResult.data.table.category.color + '40' }}
                          >
                            {currentResult.data.table.category.name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-white/20 text-white/60">
                          {currentResult.data.table?.sectorLabel}
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white/60">
                          {formatCurrency(currentResult.data.reservation?.amount || 0)}
                        </Badge>
                      </div>

                      {/* Guest names */}
                      {currentResult.data.reservation?.guestNames &&
                        currentResult.data.reservation.guestNames.length > 0 && (
                          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <p className="mb-1 text-xs font-medium text-white/40">
                              Nombres de invitados:
                            </p>
                            <p className="text-sm text-white/70">
                              {currentResult.data.reservation.guestNames.join(', ')}
                            </p>
                          </div>
                        )}

                      {/* Benefits */}
                      {currentResult.data.reservation?.benefits &&
                        currentResult.data.reservation.benefits.length > 0 && (
                          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <p className="mb-1 text-xs font-medium text-white/40">
                              Beneficios:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {currentResult.data.reservation.benefits.map((b, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="border-purple-500/30 text-purple-400 text-xs"
                                >
                                  {b}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Notes */}
                      {currentResult.data.reservation?.notes && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <p className="mb-1 text-xs font-medium text-white/40">Notas:</p>
                          <p className="text-sm text-white/70">
                            {currentResult.data.reservation.notes}
                          </p>
                        </div>
                      )}

                      <p className="text-center text-xs text-green-400/60">
                        Reserva marcada como utilizada
                      </p>
                    </div>
                  )}

                  {/* Error details */}
                  {!currentResult.success && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
                      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-400/60" />
                      <p className="text-sm text-red-400/80">
                        {currentResult.error || 'Error desconocido'}
                      </p>
                    </div>
                  )}

                  {/* Reset button */}
                  <Button
                    onClick={resetResult}
                    variant="outline"
                    className="mt-4 w-full border-white/20 text-white hover:bg-white/5"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Escanear Otro
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-white/5 bg-[#111128]">
              <CardHeader
                className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setShowHistory(!showHistory)}
              >
                <CardTitle className="flex items-center justify-between text-base text-white">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-purple-400" />
                    Historial de Escaneos ({scanHistory.length})
                  </div>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4 text-white/30" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/30" />
                  )}
                </CardTitle>
              </CardHeader>
              {showHistory && (
                <CardContent className="border-t border-white/5 pt-3">
                  <div className="space-y-2">
                    {scanHistory.map((result) => (
                      <div
                        key={result.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          result.success
                            ? 'border-green-500/20 bg-green-500/5'
                            : 'border-red-500/20 bg-red-500/5'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {result.success
                              ? `${result.data?.user?.name || 'Invitado'} - Mesa #${result.data?.table?.number || '?'}`
                              : result.error || 'Error'}
                          </p>
                          <p className="text-xs text-white/40">
                            {formatTime(result.timestamp)}
                            {result.success && result.data?.reservation && (
                              <span>
                                {' '}
                                | {result.data.reservation.guestCount} personas |{' '}
                                {formatCurrency(result.data.reservation.amount)}
                              </span>
                            )}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            result.success
                              ? 'border-green-500/30 text-green-400 text-xs'
                              : 'border-red-500/30 text-red-400 text-xs'
                          }
                        >
                          {result.success ? 'OK' : 'Error'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}

        {/* Hidden canvas for QR processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
