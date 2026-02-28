'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, useAnimation } from 'framer-motion';
import {
  Search,
  Map,
  CreditCard,
  BarChart3,
  Users,
  Layout,
  Ticket,
  Star,
  ArrowRight,
  Sparkles,
  Zap,
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ===================================================================
// Animated counter hook
// ===================================================================
function useCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref as any, { once: true });
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView || !isInView || started.current) return;
    started.current = true;

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [isInView, end, duration, startOnView]);

  return { count, ref };
}

// ===================================================================
// Floating geometric shapes for hero
// ===================================================================
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large diamond */}
      <motion.div
        animate={{
          y: [0, -30, 0],
          rotate: [0, 45, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[15%] right-[10%] h-24 w-24 border-2 border-purple-500/20 rotate-45 md:h-32 md:w-32"
      />
      {/* Small circle */}
      <motion.div
        animate={{
          y: [0, 20, 0],
          x: [0, -15, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[30%] left-[5%] h-8 w-8 rounded-full bg-pink-500/10 md:h-12 md:w-12"
      />
      {/* Triangle shape using borders */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, -30, 0],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[25%] left-[15%] h-0 w-0 border-l-[20px] border-r-[20px] border-b-[35px] border-l-transparent border-r-transparent border-b-purple-500/15 md:border-l-[30px] md:border-r-[30px] md:border-b-[52px]"
      />
      {/* Medium ring */}
      <motion.div
        animate={{
          y: [0, 25, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[20%] right-[15%] h-16 w-16 rounded-full border-2 border-pink-500/15 md:h-24 md:w-24"
      />
      {/* Dot grid pattern */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-[50%] right-[30%] h-3 w-3 rounded-full bg-purple-400/20"
      />
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        className="absolute top-[45%] left-[25%] h-2 w-2 rounded-full bg-pink-400/20"
      />
      {/* Hexagon (approximated with a rotated square + clip) */}
      <motion.div
        animate={{
          rotate: [0, 60, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[60%] right-[5%] h-14 w-14 border border-purple-500/10 rotate-12 rounded-sm md:h-20 md:w-20"
      />
      {/* Blurred glow orbs */}
      <div className="absolute top-[10%] left-[30%] h-64 w-64 rounded-full bg-purple-600/5 blur-3xl" />
      <div className="absolute bottom-[10%] right-[20%] h-48 w-48 rounded-full bg-pink-600/5 blur-3xl" />
    </div>
  );
}

// ===================================================================
// Section wrapper with scroll animation
// ===================================================================
function AnimatedSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ===================================================================
// Event card for featured events
// ===================================================================
function FeaturedEventCard({ event, index }: { event: any; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const date = new Date(event.date);
  const formattedDate = date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="min-w-[300px] max-w-[340px] flex-shrink-0 snap-start"
    >
      <Link href={`/events/${event._id}`}>
        <Card className="group cursor-pointer border-white/5 bg-[#111128] hover:border-purple-500/30 transition-all duration-300 overflow-hidden hover:neon-glow">
          {/* Cover */}
          <div className="relative aspect-[16/10] overflow-hidden">
            {event.coverImage ? (
              <img
                src={event.coverImage}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                <Calendar className="h-12 w-12 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111128] via-transparent to-transparent" />
            {event.ticketPrice != null && event.ticketPrice > 0 && (
              <div className="absolute bottom-3 right-3 rounded-lg bg-gradient-to-r from-purple-600/90 to-pink-600/90 px-3 py-1 backdrop-blur-sm">
                <span className="text-sm font-bold text-white">
                  ${event.ticketPrice?.toLocaleString('es-AR')}
                </span>
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="mb-2 text-lg font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
              {event.title}
            </h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                <span>{formattedDate}</span>
              </div>
              {event.venue && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <MapPin className="h-3.5 w-3.5 text-pink-400" />
                  <span className="truncate">{event.venue.name || event.venue}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

// ===================================================================
// Main Landing Page
// ===================================================================
export default function LandingPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Fetch featured events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events?status=active&limit=6');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setEvents(data.data?.items || data.data || []);
          }
        }
      } catch {
        // silently fail
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Stats counters
  const eventsCounter = useCounter(500, 2500);
  const reservationsCounter = useCounter(10000, 3000);
  const satisfactionCounter = useCounter(98, 2000);

  return (
    <div className="relative overflow-hidden">
      {/* ============================================================= */}
      {/* HERO SECTION */}
      {/* ============================================================= */}
      <section className="relative flex min-h-[100vh] items-center justify-center px-4 py-20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#1a0a2e] to-[#0a0a1a]" />
        <div className="absolute inset-0">
          <motion.div
            animate={{
              background: [
                'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(168, 85, 247, 0.08), transparent)',
                'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(236, 72, 153, 0.08), transparent)',
                'radial-gradient(ellipse 80% 60% at 40% 60%, rgba(168, 85, 247, 0.08), transparent)',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-full"
          />
        </div>

        <FloatingShapes />

        <div className="relative z-10 mx-auto max-w-6xl text-center">
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">
                La plataforma #1 de reservas VIP
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl lg:text-8xl"
          >
            <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
              Reserva Tu
            </span>
            <br />
            <span
              className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent neon-text"
              style={{
                textShadow:
                  '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(236, 72, 153, 0.2)',
              }}
            >
              Mesa VIP
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-white/60 md:text-xl"
          >
            La mejor experiencia en reservas de mesas para eventos nocturnos.
            Mapa 3D interactivo, pago seguro y confirmacion instantanea.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mb-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link href="/events">
              <Button
                size="lg"
                className="h-14 px-8 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow-strong"
              >
                Ver Eventos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base border-white/20 text-white hover:bg-white/5 hover:border-white/30"
              >
                Soy Organizador
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
          >
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white md:text-4xl">
                +<span ref={eventsCounter.ref}>{eventsCounter.count}</span>
              </p>
              <p className="text-sm text-white/40">Eventos</p>
            </div>
            <div className="h-10 w-px bg-white/10 hidden sm:block" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white md:text-4xl">
                +<span ref={reservationsCounter.ref}>{reservationsCounter.count.toLocaleString()}</span>
              </p>
              <p className="text-sm text-white/40">Reservas</p>
            </div>
            <div className="h-10 w-px bg-white/10 hidden sm:block" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-white md:text-4xl">
                +<span ref={satisfactionCounter.ref}>{satisfactionCounter.count}</span>%
              </p>
              <p className="text-sm text-white/40">Satisfaccion</p>
            </div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a1a] to-transparent" />
      </section>

      {/* ============================================================= */}
      {/* HOW IT WORKS SECTION */}
      {/* ============================================================= */}
      <AnimatedSection className="relative px-4 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-purple-500/30 text-purple-400"
            >
              Como funciona
            </Badge>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Reserva en <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">3 simples pasos</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                icon: Search,
                title: 'Elegi tu Evento',
                description:
                  'Explora los mejores eventos nocturnos de tu ciudad. Filtra por fecha, ubicacion y tipo.',
                gradient: 'from-purple-600 to-purple-800',
                delay: 0,
              },
              {
                step: '02',
                icon: Map,
                title: 'Selecciona tu Mesa en 3D',
                description:
                  'Navega el mapa 3D interactivo del venue. Ve cada mesa, su ubicacion y beneficios antes de reservar.',
                gradient: 'from-pink-600 to-pink-800',
                delay: 0.15,
              },
              {
                step: '03',
                icon: CreditCard,
                title: 'Paga y Listo',
                description:
                  'Pago seguro con MercadoPago. Recibi tu QR de confirmacion al instante en tu email.',
                gradient: 'from-violet-600 to-violet-800',
                delay: 0.3,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <AnimatedSection key={item.step} delay={item.delay}>
                  <Card className="group relative border-white/5 bg-[#111128] p-1 hover:border-purple-500/20 transition-all duration-300">
                    <CardContent className="p-6 md:p-8">
                      {/* Step number */}
                      <span className="absolute top-4 right-4 text-6xl font-black text-white/[0.03]">
                        {item.step}
                      </span>
                      {/* Icon */}
                      <div
                        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-white/50">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================================= */}
      {/* FEATURED EVENTS SECTION */}
      {/* ============================================================= */}
      <AnimatedSection className="relative px-4 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-pink-500/30 text-pink-400"
              >
                Eventos Destacados
              </Badge>
              <h2 className="text-3xl font-bold text-white md:text-5xl">
                Proximos <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Eventos</span>
              </h2>
            </div>
            <Link href="/events" className="hidden sm:block">
              <Button
                variant="ghost"
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
              >
                Ver todos
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Scrollable row */}
          <div className="relative">
            {eventsLoading ? (
              <div className="flex gap-6 overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-[300px] max-w-[340px] flex-shrink-0 animate-pulse"
                  >
                    <div className="rounded-xl border border-white/5 bg-[#111128] overflow-hidden">
                      <div className="aspect-[16/10] bg-white/5" />
                      <div className="p-4 space-y-3">
                        <div className="h-5 w-3/4 rounded bg-white/5" />
                        <div className="h-4 w-1/2 rounded bg-white/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-500/30">
                {events.map((event, index) => (
                  <FeaturedEventCard
                    key={event._id}
                    event={event}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-[#111128] py-16 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-white/10" />
                <p className="text-white/40">
                  No hay eventos disponibles en este momento
                </p>
                <p className="mt-1 text-sm text-white/25">
                  Vuelve pronto para ver nuevos eventos
                </p>
              </div>
            )}
          </div>

          {/* Mobile "ver todos" */}
          <div className="mt-6 text-center sm:hidden">
            <Link href="/events">
              <Button
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                Ver todos los eventos
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================================= */}
      {/* FOR ORGANIZERS SECTION */}
      {/* ============================================================= */}
      <AnimatedSection className="relative px-4 py-24 md:py-32">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-purple-500/30 text-purple-400"
            >
              Para Organizadores
            </Badge>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Todo lo que necesitas para{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                gestionar tu evento
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Herramientas profesionales para maximizar tus ventas y ofrecer la
              mejor experiencia a tus clientes
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                icon: Layout,
                title: 'Editor de Layout 3D',
                description:
                  'Disena el plano de tu venue en 3D. Posiciona mesas, escenarios y zonas con una herramienta visual intuitiva.',
                gradient: 'from-purple-600 to-indigo-600',
                delay: 0,
              },
              {
                icon: BarChart3,
                title: 'Dashboard en Tiempo Real',
                description:
                  'Monitorea ventas, reservas y metricas clave al instante. Toma decisiones informadas con datos en vivo.',
                gradient: 'from-pink-600 to-rose-600',
                delay: 0.1,
              },
              {
                icon: Users,
                title: 'Sistema de Promotores',
                description:
                  'Asigna promotores con links de referido unicos, define comisiones y trackea sus ventas automaticamente.',
                gradient: 'from-violet-600 to-purple-600',
                delay: 0.2,
              },
              {
                icon: Ticket,
                title: 'QR y Control de Acceso',
                description:
                  'Cada reserva genera un QR unico. Escanea en la puerta para validar y controlar el ingreso en tiempo real.',
                gradient: 'from-fuchsia-600 to-pink-600',
                delay: 0.3,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <AnimatedSection key={item.title} delay={item.delay}>
                  <Card className="group border-white/5 bg-[#111128] hover:border-purple-500/20 transition-all duration-300">
                    <CardContent className="flex gap-5 p-6">
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="mb-2 text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-white/50">
                          {item.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              );
            })}
          </div>

          <AnimatedSection delay={0.4} className="mt-10 text-center">
            <Link href="/register">
              <Button
                size="lg"
                className="h-14 px-10 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow"
              >
                Empeza a Organizar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </AnimatedSection>

      {/* ============================================================= */}
      {/* TESTIMONIALS SECTION */}
      {/* ============================================================= */}
      <AnimatedSection className="relative px-4 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-pink-500/30 text-pink-400"
            >
              Testimonios
            </Badge>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Lo que dicen{' '}
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                nuestros usuarios
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                name: 'Lucia Martinez',
                role: 'Cliente VIP',
                avatar: 'LM',
                text: 'Increible experiencia! Pude ver la mesa en 3D antes de reservar. El QR funciono perfecto en la entrada. Super recomendable.',
                stars: 5,
                delay: 0,
              },
              {
                name: 'Martin Rodriguez',
                role: 'Organizador - Club Neon',
                avatar: 'MR',
                text: 'MesaVIP transformo la gestion de mi club. Las ventas aumentaron un 40% gracias al sistema de promotores y el mapa 3D.',
                stars: 5,
                delay: 0.15,
              },
              {
                name: 'Valentina Gomez',
                role: 'Promotora',
                avatar: 'VG',
                text: 'Generar ventas nunca fue tan facil. Comparto mi link, mis clientes reservan solos y yo veo mis comisiones en tiempo real.',
                stars: 5,
                delay: 0.3,
              },
            ].map((testimonial) => (
              <AnimatedSection key={testimonial.name} delay={testimonial.delay}>
                <Card className="border-white/5 bg-[#111128] hover:border-purple-500/20 transition-all duration-300">
                  <CardContent className="p-6">
                    {/* Stars */}
                    <div className="mb-4 flex gap-1">
                      {Array.from({ length: testimonial.stars }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-500 text-yellow-500"
                        />
                      ))}
                    </div>
                    {/* Quote */}
                    <p className="mb-6 text-sm leading-relaxed text-white/60">
                      &ldquo;{testimonial.text}&rdquo;
                    </p>
                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-sm font-bold text-white">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-white/40">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================================= */}
      {/* FINAL CTA SECTION */}
      {/* ============================================================= */}
      <AnimatedSection className="relative px-4 py-24 md:py-32">
        <div className="mx-auto max-w-4xl">
          <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-[#1a0a2e] to-[#0a0a1a]">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
              <div className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-pink-600/10 blur-3xl" />
            </div>

            <CardContent className="relative z-10 px-6 py-16 text-center md:px-16 md:py-20">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', damping: 12 }}
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600"
              >
                <Sparkles className="h-8 w-8 text-white" />
              </motion.div>

              <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
                Listo para tu{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  proxima noche?
                </span>
              </h2>
              <p className="mx-auto mb-10 max-w-lg text-white/50">
                Unite a miles de personas que ya disfrutan de la mejor experiencia
                en reservas de mesas VIP
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-14 px-10 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow-strong"
                  >
                    Crear Cuenta Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/events">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-10 text-base border-white/20 text-white hover:bg-white/5"
                  >
                    Explorar Eventos
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AnimatedSection>
    </div>
  );
}
