import { tzOffsetMin } from '@/lib/dates';

const TZ = 'Europe/Warsaw';
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonth(nowIso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(new Date(nowIso));
}

export function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Północ 1. dnia miesiąca w Polsce jako ISO UTC. Zmiana czasu wypada w ostatnią niedzielę marca/października,
 * nigdy 1. dnia, więc przesunięcie odczytane z tej samej doby jest poprawne. */
function monthStartIso(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  const utcMidnight = new Date(Date.UTC(y, mo - 1, 1));
  return new Date(utcMidnight.getTime() - tzOffsetMin(utcMidnight) * 60_000).toISOString();
}

export function monthRange(m: string): { fromIso: string; toIso: string } {
  return { fromIso: monthStartIso(m), toIso: monthStartIso(shiftMonth(m, 1)) };
}

export function parseMonth(raw: string | undefined, nowIso: string): string {
  return raw && MONTH_RE.test(raw) ? raw : currentMonth(nowIso);
}
