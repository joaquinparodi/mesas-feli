'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Menu,
  User,
  LogOut,
  Calendar,
  LayoutDashboard,
  Ticket,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && session?.user;

  const navLinks = [
    { href: '/events', label: 'Eventos', icon: Calendar },
  ];

  const roleLinks = isAuthenticated
    ? session.user.role === 'organizer' || session.user.role === 'admin'
      ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
      : session.user.role === 'promoter'
      ? [{ href: '/promoter', label: 'Panel Promotor', icon: Ticket }]
      : []
    : [];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="sticky top-0 z-50 w-full glass-strong"
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 font-bold text-white text-sm neon-glow">
              MV
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hidden sm:inline">
              MesaVIP
            </span>
          </motion.div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
          {roleLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-white/10" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/5"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={(session.user as any).avatar || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                      {getInitials(session.user.name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate text-sm">
                    {session.user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#111128] border-white/10"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-white">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-white/50">{session.user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white focus:text-white"
                  >
                    <User className="h-4 w-4" />
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile?tab=reservas"
                    className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white focus:text-white"
                  >
                    <Ticket className="h-4 w-4" />
                    Mis Reservas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300"
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-white/70 hover:text-white hover:bg-white/5"
                >
                  Iniciar Sesion
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow">
                  Registrarse
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-80 bg-[#0a0a1a] border-white/10"
            >
              <SheetHeader>
                <SheetTitle className="text-left text-white">
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    MesaVIP
                  </span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-8 flex flex-col gap-2">
                {isAuthenticated && (
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-white/5 p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(session.user as any).avatar || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {getInitials(session.user.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-white/50">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                )}

                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
                    >
                      <link.icon className="mr-3 h-5 w-5" />
                      {link.label}
                    </Button>
                  </Link>
                ))}

                {roleLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
                    >
                      <link.icon className="mr-3 h-5 w-5" />
                      {link.label}
                    </Button>
                  </Link>
                ))}

                {isAuthenticated && (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <User className="mr-3 h-5 w-5" />
                        Mi Perfil
                      </Button>
                    </Link>
                    <Link
                      href="/profile?tab=reservas"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <Ticket className="mr-3 h-5 w-5" />
                        Mis Reservas
                      </Button>
                    </Link>
                  </>
                )}

                <div className="my-4 border-t border-white/10" />

                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Cerrar Sesion
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/5"
                      >
                        Iniciar Sesion
                      </Button>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0">
                        Registrarse
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
}
