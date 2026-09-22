import type { AppEvent, EventType } from '@/events/types';

const TZ = 'Europe/Warsaw';

export const EVENT_LABEL: Record<EventType, string> = {
  draft_created: 'Nowy szkic',
  photo_uploaded: 'Zdjęcie',
  hero_set: 'Zdjęcie na planszę',
  ai_generated: 'Generacja AI',
  ai_failed: 'Błąd AI',
  finished: 'Gotowe',
  downloaded: 'Pobranie',
  limit_hit: 'Limit',
  admin_login: 'Logowanie admina',
  admin_login_failed: 'Nieudane logowanie admina',
};

const REASON: Record<string, string> = { budget_402: 'brak środków na OpenRouter', timeout: 'przekroczony czas', error: 'błąd' };
const LIMIT: Record<string, string> = {
  drafts_per_ip: '20 szkiców/h z jednego IP',
  max_regen: '3 regeneracje na post',
  model_calls_hour: '60 generacji/h w klubie',
};

/** Koszty generacji to tysięczne części dolara — 3 miejsca po przecinku, żeby 0,004 nie zamieniło się w 0,00. */
export const fmtUsd = (x: number): string =>
  `${x.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} USD`;

export const fmtPln = (usd: number, rate: number): string =>
  (usd * rate).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

export const fmtTime = (iso: string): string =>
  new Intl.DateTimeFormat('pl-PL', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const fmtMonth = (m: string): string => {
  const [y, mo] = m.split('-').map(Number);
  return new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, mo - 1, 15)));
};

export function eventText(e: AppEvent): string {
  const m = e.meta;
  switch (e.type) {
    case 'ai_generated': return m.regen === true ? `Generacja AI (regeneracja ${String(m.regenNo)})` : 'Generacja AI';
    case 'ai_failed': return `Błąd AI: ${REASON[String(m.reason)] ?? String(m.reason)}`;
    case 'photo_uploaded': return `Zdjęcie ${String(m.n)}`;
    case 'hero_set': return `Zdjęcie ${String(m.n)} na planszę`;
    case 'downloaded': return `Pobranie: ${String(m.what)}`;
    case 'limit_hit': return `Limit: ${LIMIT[String(m.limit)] ?? String(m.limit)}`;
    case 'finished': return `Gotowe (zmiany ${String(m.changedPct)}%)`;
    default: return EVENT_LABEL[e.type];
  }
}
