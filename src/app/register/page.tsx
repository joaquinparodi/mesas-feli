'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const _registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100),
    email: z.string().email('Email invalido'),
    password: z
      .string()
      .min(6, 'La contrasena debe tener al menos 6 caracteres')
      .max(128),
    confirmPassword: z.string().min(1, 'Confirma tu contrasena'),
    phone: z.string().optional(),
    role: z.enum(['client', 'organizer']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof _registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'client' | 'organizer'>(
    'client'
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      role: 'client',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      // Register
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone || undefined,
          role: data.role,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Error al registrar');
      }

      // Auto-login
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast({
          title: 'Cuenta creada',
          description:
            'Tu cuenta fue creada exitosamente. Inicia sesion con tus datos.',
        });
        router.push('/login');
      } else {
        toast({
          title: 'Bienvenido a MesaVIP',
          description: 'Tu cuenta fue creada e iniciaste sesion.',
        });
        router.push('/events');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      toast({
        title: 'Error',
        description: err.message || 'Error al crear la cuenta',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 font-bold text-white text-lg neon-glow">
              MV
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">Crear Cuenta</h1>
          <p className="mt-1 text-sm text-white/40">
            Unite a la plataforma de reservas VIP
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-[#111128]/80 backdrop-blur-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role Selector */}
            <div className="space-y-2">
              <Label className="text-white/70">Tipo de cuenta</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('client');
                    setValue('role', 'client');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                    selectedRole === 'client'
                      ? 'border-purple-500/50 bg-purple-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                  }`}
                >
                  <User className="h-4 w-4" />
                  Cliente
                  {selectedRole === 'client' && (
                    <CheckCircle className="h-3.5 w-3.5 text-purple-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('organizer');
                    setValue('role', 'organizer');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                    selectedRole === 'organizer'
                      ? 'border-pink-500/50 bg-pink-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  Organizador
                  {selectedRole === 'organizer' && (
                    <CheckCircle className="h-3.5 w-3.5 text-pink-400" />
                  )}
                </button>
              </div>
              <input type="hidden" {...register('role')} value={selectedRole} />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/70">
                Nombre completo *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  {...register('name')}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-400">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  {...register('email')}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">
                Contrasena *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimo 6 caracteres"
                  {...register('password')}
                  className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white/70">
                Confirmar contrasena *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeti tu contrasena"
                  {...register('confirmPassword')}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white/70">
                Telefono (opcional)
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+54 11 1234 5678"
                  {...register('phone')}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 neon-glow disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear Cuenta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-white/40">
          Ya tenes cuenta?{' '}
          <Link
            href="/login"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Inicia sesion
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
