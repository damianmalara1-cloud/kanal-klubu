import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { nowIso } from '@/lib/dates';

/** Cron raz dziennie: szkice po 24 h znikają w całości, gotowe posty po 7 dniach tracą pliki (rekord zostaje jako log). */
export async function purge(now: string = nowIso()): Promise<{ purged: number; deletedDrafts: number }> {
  const repo = getRepo(), storage = getStorage();
  let purged = 0, deletedDrafts = 0;
  for (const p of await repo.listForPurge(now)) {
    await storage.remove([...p.photos, p.creativePath].filter((x): x is string => !!x));
    if (p.status === 'draft') { await repo.delete(p.id); deletedDrafts++; }
    else { await repo.update(p.id, { photos: [], heroPhoto: null, creativePath: null, purgedAt: now }); purged++; }
  }
  return { purged, deletedDrafts };
}
