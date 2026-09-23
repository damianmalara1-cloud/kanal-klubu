import { getConfig } from '@/config';
import { getCalendar } from '@/calendar';
import type { CalPatch } from '@/calendar';
import { recordEvent } from '@/events';
import type { CalEventMeta, EventType } from '@/events/types';
import { fieldsForDate, inputToFields, parseCalInput, parseSeriesInput, seriesDates, type CalEvent, type CalPatchFields } from '@/domain/calendar';
import { monthRange } from '@/admin/month';
import { addDays, isoToLocal, localToIso, nowIso } from '@/lib/dates';
import { AppError } from '@/lib/errors';
import { newId } from '@/lib/ids';

export type Scope = 'one' | 'following';
const ctx = () => { const c = getConfig(); return { teams: c.teams, coachNames: c.coachNames }; };
const metaOf = (e: CalEvent, extra: Partial<CalEventMeta> = {}): CalEventMeta =>
  ({ eventId: e.id, ...(e.seriesId ? { seriesId: e.seriesId } : {}), type: e.type, team: e.team, title: e.title, startsAt: e.startsAt, ...extra });
const rec = (type: EventType, by: string, meta: CalEventMeta) => recordEvent({ type, author: by, meta: meta as unknown as Record<string, unknown> });

export async function getEvent(id: string): Promise<CalEvent> {
  const e = await getCalendar().get(id);
  if (!e || e.deletedAt !== null) throw new AppError('Nie ma takiego wydarzenia (mogło zostać usunięte)', 404);
  return e;
}

export async function createEvent(raw: unknown, by: string): Promise<CalEvent> {
  const e = await getCalendar().create({ ...inputToFields(parseCalInput(raw, ctx())), seriesId: null, by });
  await rec('cal_created', by, metaOf(e));
  return e;
}

export async function createSeries(raw: unknown, rawSeries: unknown, by: string) {
  const input = parseCalInput(raw, ctx());
  const s = parseSeriesInput(rawSeries);
  const dates = seriesDates(input.date, s.until, s.weekdays);
  if (dates.length === 0) throw new AppError('Do: w tym zakresie nie ma żadnego z wybranych dni');
  const seriesId = newId();
  const rows = await getCalendar().createMany(dates.map((d) => ({ ...fieldsForDate(input, d), seriesId, by })));
  await rec('cal_series_created', by, metaOf(rows[0], { count: rows.length }));
  return { seriesId, count: rows.length, first: rows[0] };
}

const KEYS: (keyof CalPatchFields)[] = ['type', 'team', 'title', 'startsAt', 'endsAt', 'allDay', 'place', 'coaches', 'details'];

/** Forma porównywalna niezależnie od kolejności: tablice sortowane (kolejność `coaches` nie ma znaczenia),
 * klucze obiektów sortowane (jsonb z Postgresa nie gwarantuje kolejności `details`) — inaczej `same()` widziałby
 * zmianę tam, gdzie zmieniła się tylko kolejność, nie treść. */
type Canon = string | number | boolean | null | Canon[] | { [k: string]: Canon };
function canon(v: unknown): Canon {
  if (Array.isArray(v)) return v.map(canon).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, Canon> = {};
    for (const k of Object.keys(o).sort()) out[k] = canon(o[k]);
    return out;
  }
  return v as Canon;
}
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
export function diffFields(before: CalEvent, after: CalPatchFields): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of KEYS) if (!same(before[k], after[k])) out[k] = { from: before[k], to: after[k] };
  return out;
}

export async function updateEvent(id: string, raw: unknown, by: string, scope: Scope) {
  const repo = getCalendar();
  const before = await getEvent(id);
  const input = parseCalInput(raw, ctx());
  if (scope === 'following' && before.seriesId) {
    // `changes` liczone względem pól przeliczonych na WŁASNĄ datę edytowanego wiersza (nie `input.date`) —
    // przy zakresie „następne" data z formularza jest ignorowana dla każdego wiersza serii (patrz pętla niżej),
    // więc dziennik ma pokazywać to, co faktycznie się zmieniło, nie datę, która nigdzie nie trafiła.
    const ownFields = fieldsForDate(input, isoToLocal(before.startsAt).date);
    const changes = diffFields(before, ownFields);
    const rows = await repo.listSeriesFrom(before.seriesId, before.startsAt);
    let done = 0;
    try {
      for (const r of rows) {
        // Ta sama data co dotąd, nowe godziny/pola — `fieldsForDate` dokłada godziny z formularza do daty wiersza.
        const { date } = isoToLocal(r.startsAt);
        await repo.update(r.id, fieldsForDate(input, date), by);
        done++;
      }
    } catch (e) {
      // Seria przerwana w połowie: wiersze do `done` już zapisane, reszta nie — dziennik ma to odzwierciedlać
      // (`partial: true`), zamiast milczeć albo kłamać liczbą wszystkich wierszy. Błąd leci dalej do wywołującego.
      await rec('cal_series_updated', by, metaOf(before, { scope, count: done, changes, partial: true }));
      throw e;
    }
    await rec('cal_series_updated', by, metaOf(before, { scope, count: rows.length, changes }));
    return { event: (await repo.get(id))!, count: rows.length };
  }
  const fields = inputToFields(input);
  const changes = diffFields(before, fields);
  const dateChanged = isoToLocal(before.startsAt).date !== input.date;
  const patch: CalPatch = { ...fields, ...(dateChanged && before.seriesId ? { seriesId: null } : {}) };
  const event = await repo.update(id, patch, by);
  await rec('cal_updated', by, metaOf(before, { scope: 'one', changes }));
  return { event, count: 1 };
}

export async function deleteEvent(id: string, by: string, scope: Scope) {
  const repo = getCalendar();
  const e = await getEvent(id);
  const ids = scope === 'following' && e.seriesId ? (await repo.listSeriesFrom(e.seriesId, e.startsAt)).map((r) => r.id) : [e.id];
  await repo.softDelete(ids, by, nowIso());
  if (ids.length > 1) await rec('cal_series_deleted', by, metaOf(e, { scope, count: ids.length }));
  else await rec('cal_deleted', by, metaOf(e));
  return { ids };
}

export async function restoreEvents(ids: string[], by: string): Promise<number> {
  const repo = getCalendar();
  const first = ids[0] ? await repo.get(ids[0]) : null;
  const n = await repo.restore(ids, by);
  if (n > 0 && first) await rec('cal_restored', by, metaOf(first, ids.length > 1 ? { count: n } : {}));
  return n;
}

export async function restoreSeries(seriesId: string, by: string): Promise<number> {
  const ids = (await getCalendar().listDeleted()).filter((e) => e.seriesId === seriesId).map((e) => e.id);
  return restoreEvents(ids, by);
}

export const listWeek = (weekStartDate: string, team?: string | null) =>
  getCalendar().listRange(localToIso(weekStartDate, '00:00'), localToIso(addDays(weekStartDate, 7), '00:00'), team);
export const listMonth = (month: string, team?: string | null) => { const r = monthRange(month); return getCalendar().listRange(r.fromIso, r.toIso, team); };
