import type { AppEvent, CalEventMeta, EventType } from '@/events/types';
import { CAL_TYPE_LABEL } from '@/domain/calendar';
import { isoToLocal } from '@/lib/dates';

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
  cal_created: 'Kalendarz: dodanie',
  cal_series_created: 'Kalendarz: seria',
  cal_updated: 'Kalendarz: zmiana',
  cal_series_updated: 'Kalendarz: zmiana serii',
  cal_deleted: 'Kalendarz: usunięcie',
  cal_series_deleted: 'Kalendarz: usunięcie serii',
  cal_restored: 'Kalendarz: przywrócenie',
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

const WD_PL = ['', 'pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
/** „wt 29.09 16:30" — dzień tygodnia bez roku, bo dziennik i tak jest per miesiąc. */
export const fmtWhen = (iso: string): string => {
  const { date, time, weekday } = isoToLocal(iso);
  const [, mo, d] = date.split('-');
  return `${WD_PL[weekday]} ${d}.${mo} ${time}`;
};
const fmtDay = (iso: string) => fmtWhen(iso).replace(/ \d{2}:\d{2}$/, '');
const fmtTimeOnly = (iso: string) => fmtWhen(iso).slice(-5);

const CHANGE_LABEL: Record<string, string> = {
  startsAt: 'początek', endsAt: 'koniec', place: 'miejsce', team: 'drużyna',
  title: 'tytuł', coaches: 'trener', details: 'szczegóły', allDay: 'cały dzień',
};
const changeVal = (k: string, v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (k === 'startsAt' || k === 'endsAt') return fmtTimeOnly(String(v));
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

/** Opisy zdarzeń kalendarza — osobna funkcja, bo `meta` ma tu jednolity kształt (`CalEventMeta`), nie per-typ jak reszta `eventText`. */
function calText(e: AppEvent): string {
  const m = e.meta as unknown as CalEventMeta;
  const what = `${CAL_TYPE_LABEL[m.type].toLowerCase()} ${m.team ?? 'cały klub'}${m.type === 'trening' ? '' : ` ${m.title}`}`;
  const changes = Object.entries(m.changes ?? {})
    .map(([k, c]) => ` · ${CHANGE_LABEL[k] ?? k} ${changeVal(k, c.from)} → ${changeVal(k, c.to)}`)
    .join('');
  switch (e.type) {
    case 'cal_created': return `Dodanie: ${what}, ${fmtWhen(m.startsAt)}`;
    case 'cal_series_created': return `Dodanie serii ${m.count} treningów: ${m.team ?? 'cały klub'}, od ${fmtWhen(m.startsAt)}`;
    case 'cal_updated': return `Zmiana: ${what}, ${fmtDay(m.startsAt)}${changes}`;
    case 'cal_series_updated': return `Zmiana ${m.count} terminów serii: ${what}, od ${fmtDay(m.startsAt)}${changes}`;
    case 'cal_deleted': return `Usunięcie: ${what}, ${fmtWhen(m.startsAt)}`;
    case 'cal_series_deleted': return `Usunięcie ${m.count} terminów serii: ${what}, od ${fmtWhen(m.startsAt)}`;
    case 'cal_restored': return `Przywrócenie: ${what}, ${fmtWhen(m.startsAt)}`;
    default: return EVENT_LABEL[e.type];
  }
}

export function eventText(e: AppEvent): string {
  if (e.type.startsWith('cal_')) return calText(e);
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
