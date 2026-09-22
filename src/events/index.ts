import 'server-only';
import { getConfig } from '@/config';
import { errMessage } from '@/lib/errors';
import { log } from '@/lib/log';
import { MemoryEvents } from './memory';
import { SupabaseEvents } from './supabase';
import type { EventsRepo, NewEvent } from './types';
export type { AppEvent, EventType, EventsRepo, NewEvent } from './types';
export { EVENT_TYPES } from './types';

const g = globalThis as unknown as { __kkEvents?: EventsRepo };

export function getEvents(): EventsRepo {
  if (!g.__kkEvents) {
    const c = getConfig();
    g.__kkEvents = c.mockExternal ? new MemoryEvents() : new SupabaseEvents(c.supabaseUrl, c.supabaseServiceKey);
  }
  return g.__kkEvents;
}

/** Zapis zdarzenia best-effort (spec §10): dziennik nigdy nie blokuje trenera. Błąd → log `event`, bez rzucania.
 * Świadomy koszt: przy awarii bazy dziura w statystykach zamiast meczu bez posta. */
export async function recordEvent(e: NewEvent): Promise<void> {
  try {
    await getEvents().add(e);
  } catch (err) {
    log.error('event', { type: e.type, err: errMessage(err) });
  }
}
