'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  /** Target expiry time (ISO string or Date) */
  expiresAt: string | Date;
  /** Callback when the timer expires */
  onExpire?: () => void;
  /** Optional className */
  className?: string;
}

export default function CountdownTimer({
  expiresAt,
  onExpire,
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [expired, setExpired] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const target = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((target - now) / 1000));
  }, [expiresAt]);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setExpired(true);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft > 0 && timeLeft <= 120; // under 2 min

  if (expired) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3',
          className
        )}
      >
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-400">Tiempo agotado</p>
          <p className="text-xs text-red-400/60">
            Tu reserva ha expirado. La mesa fue liberada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors duration-300',
        isUrgent
          ? 'border-red-500/30 bg-red-500/10 animate-pulse'
          : 'border-yellow-500/20 bg-yellow-500/5',
        className
      )}
    >
      <Clock
        className={cn(
          'h-5 w-5',
          isUrgent ? 'text-red-400' : 'text-yellow-400'
        )}
      />
      <div className="flex-1">
        <p
          className={cn(
            'text-xs',
            isUrgent ? 'text-red-400/60' : 'text-yellow-400/60'
          )}
        >
          Tiempo para completar la reserva
        </p>
        <p
          className={cn(
            'text-xl font-mono font-bold tabular-nums',
            isUrgent ? 'text-red-400' : 'text-yellow-400'
          )}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
