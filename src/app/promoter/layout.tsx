'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  TableProperties,
  LinkIcon,
  Menu,
  ChevronLeft,
  LogOut,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  {
    label: 'Resumen',
    href: '/promoter',
    icon: LayoutDashboard,
  },
  {
    label: 'Mis Mesas',
    href: '/promoter/tables',
    icon: TableProperties,
  },
  {
    label: 'Mi Link',
    href: '/promoter/link',
    icon: LinkIcon,
  },
];

export default function PromoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (
      status === 'authenticated' &&
      session?.user?.role !== 'promoter' &&
      session?.user?.role !== 'admin'
    ) {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen bg-[#0a0a1a]">
        <div className="hidden w-64 border-r border-white/10 bg-[#0d0d1f] lg:block">
          <div className="p-6">
            <Skeleton className="h-8 w-32 bg-white/5" />
          </div>
          <div className="space-y-2 px-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-white/5" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-6 h-8 w-48 bg-white/5" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (
    status === 'authenticated' &&
    session?.user?.role !== 'promoter' &&
    session?.user?.role !== 'admin'
  ) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/promoter') return pathname === '/promoter';
    if (href === '/promoter/link') return pathname.startsWith('/promoter/link');
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-600 to-purple-600">
          <Ticket className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-lg font-bold text-transparent">
              MesaVIP
            </h1>
            <p className="text-[10px] text-white/40">Panel Promotor</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                  ${
                    active
                      ? 'bg-pink-600/20 text-pink-400 neon-glow-pink'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }
                `}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 ${
                    active ? 'text-pink-400' : 'text-white/40 group-hover:text-white/60'
                  }`}
                />
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && (
                  <motion.div
                    layoutId="promoter-sidebar-active"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-pink-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User info & collapse */}
      <div className="border-t border-white/10 p-4">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600/30 text-xs font-bold text-pink-300">
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/80">
                {session?.user?.name}
              </p>
              <p className="truncate text-[10px] text-white/40">
                {session?.user?.email}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden text-white/40 hover:text-white lg:flex"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/api/auth/signout')}
            className="text-white/40 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2 text-xs">Salir</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0a1a]">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-[#0d0d1f]/95 backdrop-blur-xl lg:block"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-[#0d0d1f] lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-200 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        }`}
      >
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0a0a1a]/90 px-4 py-3 backdrop-blur-lg lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="text-white/60"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-pink-600 to-purple-600">
              <Ticket className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white/80">Panel Promotor</span>
          </div>
        </div>

        {/* Page content */}
        <div className="min-h-[calc(100vh-60px)] p-4 md:p-6 lg:min-h-screen lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
