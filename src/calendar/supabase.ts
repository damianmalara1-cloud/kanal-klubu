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
  async listRange(fromIso: string, toIso: string, team?: string | null) {
    let q = this.q().select('*').is('deleted_at', null).lt('starts_at', toIso).gt('ends_at', fromIso).order('starts_at', { ascending: true });
    if (team === null) q = q.is('team', null); else if (team !== undefined) q = q.eq('team', team);
    const { data, error } = await q; if (error) throw error; return (data ?? []).map(fromRow);
  }
  async listSeriesFrom(seriesId: string, fromIso: string) {
    if (!UUID_RE.test(seriesId)) return [];
    const { data, error } = await this.q().select('*').is('deleted_at', null).eq('series_id', seriesId).gte('starts_at', fromIso).order('starts_at', { ascending: true });
    if (error) throw error; return (data ?? []).map(fromRow);
  }
  async update(id: string, patch: CalPatch, by: string) {
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
    const { data, error } = await this.q().select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).order('starts_at', { ascending: true });
    if (error) throw error; return (data ?? []).map(fromRow);
  }
  async purgeDeletedBefore(iso: string) {
    const { count, error } = await this.q().delete({ count: 'exact' }).lt('deleted_at', iso);
    if (error) throw error; return count ?? 0;
  }
}
