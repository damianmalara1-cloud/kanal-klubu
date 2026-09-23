'use server';
import { isValidSecret } from '@/lib/access';
import { actionFail } from '@/lib/errors';
import { createEvent, createSeries, deleteEvent, restoreEvents, updateEvent, type Scope } from '@/workflow/calendar';

type Err = { error: string };
const BAD = { error: 'Nieprawidłowy link' } as const;
const NO_NAME = { error: 'Wybierz swoje imię' } as const;
const guard = (secret: string, by: string): Err | null => (!isValidSecret(secret) ? BAD : !by.trim() ? NO_NAME : null);

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
