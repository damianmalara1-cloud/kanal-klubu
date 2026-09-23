import type { CalType } from '@/domain/calendar';

export type EventType =
  | 'draft_created' | 'photo_uploaded' | 'hero_set' | 'ai_generated' | 'ai_failed'
  | 'finished' | 'downloaded' | 'limit_hit' | 'admin_login' | 'admin_login_failed'
  | 'cal_created' | 'cal_series_created' | 'cal_updated' | 'cal_series_updated'
  | 'cal_deleted' | 'cal_series_deleted' | 'cal_restored';

export const EVENT_TYPES: EventType[] = [
  'draft_created', 'photo_uploaded', 'hero_set', 'ai_generated', 'ai_failed',
  'finished', 'downloaded', 'limit_hit', 'admin_login', 'admin_login_failed',
  'cal_created', 'cal_series_created', 'cal_updated', 'cal_series_updated',
  'cal_deleted', 'cal_series_deleted', 'cal_restored',
];

/** `meta` zdarzeń `cal_*` — ustala `calendar/*` (Task 5), konsumuje `admin/format.ts`. */
export interface CalEventMeta {
  eventId: string;
  seriesId?: string;
  type: CalType;
  team: string | null;
  title: string;
  startsAt: string;
  scope?: 'one' | 'following';
  count?: number;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export type Json = Record<string, unknown>;

/** Wejście do `add`. Brakujące pola adapter uzupełnia null/{}; `at` domyślnie teraz. */
export interface NewEvent {
  type: EventType;
  author?: string | null;
  postId?: string | null;
  costUsd?: number | null;
  meta?: Json;
  content?: Json | null;
  at?: string;
}

export interface AppEvent {
  id: string;
  at: string;
  type: EventType;
  author: string | null;
  postId: string | null;
  costUsd: number | null;
  meta: Json;
  content: Json | null;
}

/** Górny limit wierszy jednego `listRange` — miesiąc klubu to setki zdarzeń, limit łapie tylko patologię. */
export const EVENTS_LIST_CAP = 5000;

export interface EventsRepo {
  /** Dyskryminator adaptera — NIGDY `instanceof` (obiekt w `globalThis` bywa instancją innej kopii klasy, patrz `storage/types.ts`). */
  readonly kind: 'memory' | 'supabase';
  add(e: NewEvent): Promise<void>;
  /** Zdarzenia z `at` w [fromIso, toIso), od najnowszego. */
  listRange(fromIso: string, toIso: string, limit?: number): Promise<AppEvent[]>;
  /** Zdarzenia jednego posta, chronologicznie. */
  listByPost(postId: string): Promise<AppEvent[]>;
  /** Liczba zdarzeń typu od `sinceIso` włącznie; z `ip` — tylko te z `meta.ip === ip`. */
  countSince(type: EventType, sinceIso: string, ip?: string): Promise<number>;
  /** Zeruje `content` zdarzeń posta; zwraca liczbę wyzerowanych. */
  clearContent(postId: string): Promise<number>;
  /** Zeruje `content` zdarzeń starszych niż `iso`; zwraca liczbę wyzerowanych. */
  clearContentBefore(iso: string): Promise<number>;
  /** Kasuje zdarzenia starsze niż `iso`; `type` null = wszystkie typy. Zwraca liczbę skasowanych. */
  deleteBefore(type: EventType | null, iso: string): Promise<number>;
}
