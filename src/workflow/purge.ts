import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { getEvents } from '@/events';
import { nowIso, plusDays } from '@/lib/dates';
import { errMessage } from '@/lib/errors';
import { log } from '@/lib/log';

/** Retencja dziennika zdarzeń (spec §6). */
export const EVENT_CONTENT_MAX_DAYS = 8; // siatka bezpieczeństwa: treść nie żyje dłużej niż gotowy post (7 dni) + doba
export const LOGIN_FAILED_KEEP_DAYS = 1; // `admin_login_failed` trzyma IP — potrzebne tylko do limitu prób (15 min)
export const EVENTS_KEEP_DAYS = 365;

export interface PurgeResult { purged: number; deletedDrafts: number; failed: number; eventsContentCleared: number; eventsDeleted: number }

/** Cron raz dziennie: szkice po 24 h znikają w całości, gotowe posty po 7 dniach tracą pliki (rekord zostaje jako log).
 * Błąd na pojedynczym poście (storage albo repo) jest izolowany try/catch per item — nie może zablokować
 * reszty przeterminowanej kolejki. Nieudany post zostaje nietknięty (spróbujemy znów następnego dnia).
 * Treść zdarzeń posta znika razem z nim; sprzątanie dziennika ma własne try/catch i nie cofa sprzątania postów. */
export async function purge(now: string = nowIso()): Promise<PurgeResult> {
  const repo = getRepo(), storage = getStorage(), events = getEvents();
  let purged = 0, deletedDrafts = 0, failed = 0, eventsContentCleared = 0, eventsDeleted = 0;
  for (const p of await repo.listForPurge(now)) {
    try {
      await storage.remove([...p.photos, p.creativePath].filter((x): x is string => !!x));
      if (p.status === 'draft') { await repo.delete(p.id); deletedDrafts++; }
      // `ip` znika razem z plikami — było potrzebne wyłącznie do rate limitu 20 postów/h w oknie godziny,
      // po retencji zostaje log posta (kto, co, kiedy), a nie dana osobowa trzymana bezterminowo.
      else { await repo.update(p.id, { photos: [], heroPhoto: null, creativePath: null, purgedAt: now, ip: null }); purged++; }
    } catch (e) {
      log.error('purge', { id: p.id, err: e instanceof Error ? e.message : String(e) });
      failed++;
      continue; // post nietknięty → jego zdarzenia też zostają do następnej próby
    }
    try {
      eventsContentCleared += await events.clearContent(p.id);
    } catch (e) {
      log.error('purge-events', { id: p.id, err: errMessage(e) });
      failed++;
    }
  }
  try {
    eventsContentCleared += await events.clearContentBefore(plusDays(now, -EVENT_CONTENT_MAX_DAYS));
    eventsDeleted += await events.deleteBefore('admin_login_failed', plusDays(now, -LOGIN_FAILED_KEEP_DAYS));
    eventsDeleted += await events.deleteBefore(null, plusDays(now, -EVENTS_KEEP_DAYS));
  } catch (e) {
    log.error('purge-events', { err: errMessage(e) });
    failed++;
  }
  return { purged, deletedDrafts, failed, eventsContentCleared, eventsDeleted };
}
