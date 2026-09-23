'use server';
import { getConfig } from '@/config';
import { isValidSecret } from '@/lib/access';
import { actionFail } from '@/lib/errors';
import { createEvent, createSeries, deleteEvent, restoreEvents, updateEvent, type Scope } from '@/workflow/calendar';

type Err = { error: string };
const BAD = { error: 'Nieprawidłowy link' } as const;
const NO_NAME = { error: 'Wybierz swoje imię' } as const;
// Ten sam komunikat co `createDraft` w `workflow/draft.ts` — spójność między formularzem posta i kalendarzem.
const UNKNOWN_NAME = { error: 'Nieznany trener' } as const;
/** `by` przychodzi z klienta bez żadnej innej autoryzacji poza sekretem w linku (I2) — bez sprawdzenia listy
 * `COACH_NAMES` ktokolwiek ze znajomością sekretu mógłby podpisać wydarzenie dowolnym imieniem/nickiem, co
 * trafiłoby do dziennika (`created_by`/`author`) jako fałszywy autor. Admin-owe przywrócenie z kosza idzie
 * przez `workflow/calendar.ts` bezpośrednio z `by: 'admin'`, nie przez ten guard — świadomie pominięte tutaj. */
const guard = (secret: string, by: string): Err | null => {
  if (!isValidSecret(secret)) return BAD;
  if (!by.trim()) return NO_NAME;
  if (!getConfig().coachNames.includes(by)) return UNKNOWN_NAME;
  return null;
};

export async function createEventAction(secret: string, by: string, raw: unknown): Promise<{ id: string } | Err> {
  const g = guard(secret, by); if (g) return g;
  try { return { id: (await createEvent(raw, by)).id }; } catch (e) { return actionFail(e); }
}
export async function createSeriesAction(secret: string, by: string, raw: unknown, rawSeries: unknown): Promise<{ seriesId: string; count: number; firstId: string } | Err> {
  const g = guard(secret, by); if (g) return g;
  try { const r = await createSeries(raw, rawSeries, by); return { seriesId: r.seriesId, count: r.count, firstId: r.first.id }; } catch (e) { return actionFail(e); }
}
export async function updateEventAction(secret: string, by: string, id: string, raw: unknown, scope: Scope): Promise<{ id: string; count: number } | Err> {
  const g = guard(secret, by); if (g) return g;
  try { const r = await updateEvent(id, raw, by, scope); return { id: r.event.id, count: r.count }; } catch (e) { return actionFail(e); }
}
export async function deleteEventAction(secret: string, by: string, id: string, scope: Scope): Promise<{ ids: string[] } | Err> {
  const g = guard(secret, by); if (g) return g;
  try { return await deleteEvent(id, by, scope); } catch (e) { return actionFail(e); }
}
export async function restoreAction(secret: string, by: string, ids: string[]): Promise<{ restored: number } | Err> {
  const g = guard(secret, by); if (g) return g;
  try { return { restored: await restoreEvents(ids.slice(0, 200), by) }; } catch (e) { return actionFail(e); }
}
