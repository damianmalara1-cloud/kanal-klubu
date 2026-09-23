import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { UUID_RE } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import type { CalDetails, CalEvent, CalType } from '@/domain/calendar';
import type { CalendarRepo, CalPatch, NewCalEvent } from './types';

const iso = (v: unknown) => new Date(v as string).toISOString();
export const fromRow = (r: Record<string, unknown>): CalEvent => ({
  id: String(r.id), type: r.type as CalType, team: (r.team as string | null) ?? null, title: String(r.title),
  startsAt: iso(r.starts_at), endsAt: iso(r.ends_at), allDay: Boolean(r.all_day), place: (r.place as string | null) ?? null,
  coaches: (r.coaches as string[] | null) ?? [], details: (r.details as CalDetails | null) ?? {}, seriesId: (r.series_id as string | null) ?? null,
  createdBy: String(r.created_by), updatedBy: String(r.updated_by), createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  deletedAt: r.deleted_at == null ? null : iso(r.deleted_at), deletedBy: (r.deleted_by as string | null) ?? null,
});
export const toInsert = (e: NewCalEvent) => ({
  type: e.type, team: e.team, title: e.title, starts_at: e.startsAt, ends_at: e.endsAt, all_day: e.allDay, place: e.place,
  coaches: e.coaches, details: e.details, series_id: e.seriesId, created_by: e.by, updated_by: e.by,
});
const PATCH_COL: Record<keyof CalPatch, string> = { type: 'type', team: 'team', title: 'title', startsAt: 'starts_at', endsAt: 'ends_at', allDay: 'all_day', place: 'place', coaches: 'coaches', details: 'details', seriesId: 'series_id' };
export const toPatch = (p: CalPatch, by: string) => {
  const out: Record<string, unknown> = { updated_by: by, updated_at: nowIso() };
  for (const k of Object.keys(p) as (keyof CalPatch)[]) if (p[k] !== undefined) out[PATCH_COL[k]] = p[k];
  return out;
};
const validIds = (ids: string[]) => ids.filter((i) => UUID_RE.test(i));

/** PostgREST nie zwraca więcej niż 1000 wierszy na zapytanie (`max-rows`) — bez paginacji `klub.ics` i kosz
 * kalendarza po przekroczeniu tego progu milcząco tracą resztę wierszy. `q` to gotowy, przefiltrowany query
 * builder — Supabase'owy `.range()` zwraca `this`, więc kolejne wywołania na tym samym obiekcie tylko
 * przesuwają okno i można go bezpiecznie odpytać ponownie. */
const PAGE = 1000;
interface RangeableQuery<T> { range(from: number, to: number): PromiseLike<{ data: T[] | null; error: unknown }> }
export async function pageAll<T>(q: RangeableQuery<T>): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await q.range(offset, offset + PAGE - 1);
    if (error) throw error;
    const page = data ?? [];
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

export class SupabaseCalendar implements CalendarRepo {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;
  constructor(url: string, key: string) { this.sb = createClient(url, key, { auth: { persistSession: false } }); }
  private q() { return this.sb.from('calendar_events'); }

  async create(e: NewCalEvent) {
    const { data, error } = await this.q().insert(toInsert(e)).select('*').single();
    if (error) throw error; return fromRow(data);
  }
  async createMany(rows: NewCalEvent[]) {
    if (rows.length === 0) return [];
    const { data, error } = await this.q().insert(rows.map(toInsert)).select('*');
    if (error) throw error; return (data ?? []).map(fromRow);
  }
  async get(id: string) {
    if (!UUID_RE.test(id)) return null;
    const { data, error } = await this.q().select('*').eq('id', id).maybeSingle();
    if (error) throw error; return data ? fromRow(data) : null;
  }
  /** `team` string: zwraca wydarzenia tej drużyny ORAZ całego klubu (`team IS NULL`) — reguła kontrolera (I6):
   * trener drużyny musi widzieć zbiórki całego klubu w swoim filtrze/subskrypcji `.ics`. Dwa zapytania +
   * scalenie zamiast `.or('team.eq.…,team.is.null')` — nazwy drużyn mają nawiasy (np. „młodzicy (2011+)"),
   * a PostgREST wymaga wtedy ręcznego cytowania wartości w składni `.or()`, co jest kruche; osobne zapytania
   * są prostsze do zweryfikowania i nie zależą od znaków w nazwie drużyny. `team === null` zostaje bez zmian
   * („tylko klubowe"), `team === undefined` bez zmian (wszystko). */
  async listRange(fromIso: string, toIso: string, team?: string | null) {
    const base = () => this.q().select('*').is('deleted_at', null).lt('starts_at', toIso).gt('ends_at', fromIso).order('starts_at', { ascending: true });
    if (team === undefined) return (await pageAll<Record<string, unknown>>(base())).map(fromRow);
    if (team === null) return (await pageAll<Record<string, unknown>>(base().is('team', null))).map(fromRow);
    const [teamRows, clubRows] = await Promise.all([
      pageAll<Record<string, unknown>>(base().eq('team', team)),
      pageAll<Record<string, unknown>>(base().is('team', null)),
    ]);
    return [...teamRows, ...clubRows].map(fromRow).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  async listSeriesFrom(seriesId: string, fromIso: string) {
    if (!UUID_RE.test(seriesId)) return [];
    const q = this.q().select('*').is('deleted_at', null).eq('series_id', seriesId).gte('starts_at', fromIso).order('starts_at', { ascending: true });
    return (await pageAll<Record<string, unknown>>(q)).map(fromRow);
  }
  async update(id: string, patch: CalPatch, by: string) {
    if (!UUID_RE.test(id)) throw new Error(`calendar: brak ${id}`);
    const { data, error } = await this.q().update(toPatch(patch, by)).eq('id', id).select('*').single();
    if (error) throw error; return fromRow(data);
  }
  async updateMany(ids: string[], patch: CalPatch, by: string) {
    const v = validIds(ids); if (v.length === 0) return 0;
    const { count, error } = await this.q().update(toPatch(patch, by), { count: 'exact' }).in('id', v);
    if (error) throw error; return count ?? 0;
  }
  async softDelete(ids: string[], by: string, atIso: string) {
    const v = validIds(ids); if (v.length === 0) return 0;
    const { count, error } = await this.q().update({ deleted_at: atIso, deleted_by: by }, { count: 'exact' }).in('id', v).is('deleted_at', null);
    if (error) throw error; return count ?? 0;
  }
  async restore(ids: string[], by: string) {
    const v = validIds(ids); if (v.length === 0) return 0;
    const { count, error } = await this.q().update({ deleted_at: null, deleted_by: null, updated_by: by, updated_at: nowIso() }, { count: 'exact' }).in('id', v).not('deleted_at', 'is', null);
    if (error) throw error; return count ?? 0;
  }
  async listDeleted() {
    const q = this.q().select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).order('starts_at', { ascending: true });
    return (await pageAll<Record<string, unknown>>(q)).map(fromRow);
  }
  async purgeDeletedBefore(iso: string) {
    const { count, error } = await this.q().delete({ count: 'exact' }).lt('deleted_at', iso);
    if (error) throw error; return count ?? 0;
  }
}
