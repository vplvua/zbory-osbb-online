'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCountdownParts,
  getRemainingMs,
  getRemainingProgressPercent,
  getTimerLevel,
  type TimerLevel,
} from '@/lib/vote/timer';

const TIMER_STYLES: Record<TimerLevel, { text: string; track: string; fill: string }> = {
  green: {
    text: 'text-emerald-700',
    track: 'bg-emerald-100',
    fill: 'bg-emerald-500',
  },
  yellow: {
    text: 'text-amber-700',
    track: 'bg-amber-100',
    fill: 'bg-amber-500',
  },
  red: {
    text: 'text-red-700',
    track: 'bg-red-100',
    fill: 'bg-red-500',
  },
  gray: {
    text: 'text-foreground/80',
    track: 'bg-surface-muted',
    fill: 'bg-border',
  },
};

type CountdownTimerProps = {
  createdAt: string;
  expiresAt: string;
  initialNow: string;
  onExpiredChange?: (expired: boolean) => void;
};

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export default function CountdownTimer({
  createdAt,
  expiresAt,
  initialNow,
  onExpiredChange,
}: CountdownTimerProps) {
  const startAt = useMemo(() => new Date(createdAt), [createdAt]);
  const endAt = useMemo(() => new Date(expiresAt), [expiresAt]);
  const initialNowDate = useMemo(() => new Date(initialNow), [initialNow]);
  const [now, setNow] = useState<Date>(() => initialNowDate);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const remainingMs = getRemainingMs(endAt, now);
  const parts = getCountdownParts(remainingMs);
  const level = getTimerLevel(remainingMs);
  const styles = TIMER_STYLES[level];
  const progress = Math.round(getRemainingProgressPercent(startAt, endAt, now));
  const isExpired = remainingMs <= 0;

  useEffect(() => {
    onExpiredChange?.(isExpired);
  }, [isExpired, onExpiredChange]);

  return (
    <div className="border-border bg-surface space-y-3 rounded-lg border p-4">
      <p className={`text-sm font-medium ${styles.text}`}>
        До завершення голосування:{' '}
        <span>
          {parts.days} дн {formatTwoDigits(parts.hours)}:{formatTwoDigits(parts.minutes)}:
          {formatTwoDigits(parts.seconds)}
        </span>
      </p>

      <div className="space-y-2">
        <div className={`h-2.5 w-full overflow-hidden rounded-full ${styles.track}`}>
          <div className={`h-full ${styles.fill}`} style={{ width: `${progress}%` }} />
        </div>
        <p className={`text-xs ${styles.text}`}>Залишилось часу: {progress}%</p>
      </div>

      {isExpired ? (
        <p className="text-foreground/80 text-sm">
          Термін голосування завершено. Форма заблокована.
        </p>
      ) : null}
    </div>
  );
}
