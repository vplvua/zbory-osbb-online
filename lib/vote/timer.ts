const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SECOND_MS = 1000;

export type TimerLevel = 'green' | 'yellow' | 'red' | 'gray';

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getRemainingMs(expiresAt: Date, now: Date): number {
  return Math.max(expiresAt.getTime() - now.getTime(), 0);
}

export function getCountdownParts(remainingMs: number): CountdownParts {
  const safeRemaining = Math.max(remainingMs, 0);
  const days = Math.floor(safeRemaining / DAY_MS);
  const hours = Math.floor((safeRemaining % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((safeRemaining % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((safeRemaining % MINUTE_MS) / SECOND_MS);

  return { days, hours, minutes, seconds };
}

export function getTimerLevel(remainingMs: number): TimerLevel {
  if (remainingMs <= 0) {
    return 'gray';
  }

  if (remainingMs < 3 * DAY_MS) {
    return 'red';
  }

  if (remainingMs <= 7 * DAY_MS) {
    return 'yellow';
  }

  return 'green';
}

export function getRemainingProgressPercent(startAt: Date, expiresAt: Date, now: Date): number {
  const totalWindowMs = expiresAt.getTime() - startAt.getTime();
  if (totalWindowMs <= 0) {
    return 0;
  }

  if (now <= startAt) {
    return 100;
  }

  if (now >= expiresAt) {
    return 0;
  }

  const remainingMs = getRemainingMs(expiresAt, now);
  return (remainingMs / totalWindowMs) * 100;
}
