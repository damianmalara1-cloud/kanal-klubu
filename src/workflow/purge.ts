import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { nowIso } from '@/lib/dates';
import { log } from '@/lib/log';

/** Cron raz dziennie: szkice po 24 h znikają w całości, gotowe posty po 7 dniach tracą pliki (rekord zostaje jako log).
 * Błąd na pojedynczym poście (storage albo repo) jest izolowany try/catch per item — nie może zablokować
 * reszty przeterminowanej kolejki. Nieudany post zostaje nietknięty (spróbujemy znów następnego dnia). */
export async function purge(now: string = nowIso()): Promise<{ purged: number; deletedDrafts: number; failed: number }> {
  const repo = getRepo(), storage = getStorage();
  let purged = 0, deletedDrafts = 0, failed = 0;
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
    }
  }
  return { purged, deletedDrafts, failed };
}
