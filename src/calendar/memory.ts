import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import type { CalEvent } from '@/domain/calendar';
import type { CalendarRepo, CalPatch, NewCalEvent } from './types';

const clone = (e: CalEvent): CalEvent => structuredClone(e);
const byStart = (a: CalEvent, b: CalEvent) => a.startsAt.localeCompare(b.startsAt);
/** Odsiewa jawne `undefined` z patcha — jak `toPatch` w adapterze Supabase, `undefined` = „nie zmieniaj tego pola". */
const defined = (p: CalPatch): CalPatch => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as CalPatch;

export class MemoryCalendar implements CalendarRepo {
  readonly kind = 'memory' as const;
  private rows: CalEvent[] = [];

  private make(e: NewCalEvent, now: string): CalEvent {
    const { by, ...fields } = e;
    return { id: newId(), ...structuredClone(fields), createdBy: by, updatedBy: by, createdAt: now, updatedAt: now, deletedAt: null, deletedBy: null };
  }
  async create(e: NewCalEvent) { const r = this.make(e, nowIso()); this.rows.push(r); return clone(r); }
  async createMany(rows: NewCalEvent[]) { const now = nowIso(); const made = rows.map((e) => this.make(e, now)); this.rows.push(...made); return made.map(clone); }
  async get(id: string) { const r = this.rows.find((x) => x.id === id); return r ? clone(r) : null; }
  /** `team` string: filtr drużyny ORAZ wydarzeń całego klubu (`team === null`) — reguła kontrolera (I6), ten
   * sam kontrakt co `SupabaseCalendar.listRange`. `team === null` samo w sobie zostaje „tylko klubowe";
   * `team === undefined` bez zmian (wszystko). */
  async listRange(fromIso: string, toIso: string, team?: string | null) {
    const match = (r: CalEvent) => team === undefined || (team === null ? r.team === null : r.team === team || r.team === null);
    return this.rows
      .filter((r) => r.deletedAt === null && r.startsAt < toIso && r.endsAt > fromIso && match(r))
      .sort(byStart).map(clone);
  }
  async listSeriesFrom(seriesId: string, fromIso: string) {
    return this.rows.filter((r) => r.deletedAt === null && r.seriesId === seriesId && r.startsAt >= fromIso).sort(byStart).map(clone);
  }
  async update(id: string, patch: CalPatch, by: string) {
    const r = this.rows.find((x) => x.id === id);
    if (!r) throw new Error(`calendar: brak ${id}`);
    Object.assign(r, structuredClone(defined(patch)), { updatedBy: by, updatedAt: nowIso() });
    return clone(r);
  }
  async updateMany(ids: string[], patch: CalPatch, by: string) {
    let n = 0; const now = nowIso(); const p = defined(patch);
    for (const r of this.rows) if (ids.includes(r.id)) { Object.assign(r, structuredClone(p), { updatedBy: by, updatedAt: now }); n++; }
    return n;
  }
  async softDelete(ids: string[], by: string, atIso: string) {
    let n = 0;
    for (const r of this.rows) if (ids.includes(r.id) && r.deletedAt === null) { r.deletedAt = atIso; r.deletedBy = by; n++; }
    return n;
  }
  async restore(ids: string[], by: string) {
    let n = 0; const now = nowIso();
    for (const r of this.rows) if (ids.includes(r.id) && r.deletedAt !== null) { r.deletedAt = null; r.deletedBy = null; r.updatedBy = by; r.updatedAt = now; n++; }
    return n;
  }
  async listDeleted() {
    return this.rows.filter((r) => r.deletedAt !== null).sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!) || byStart(a, b)).map(clone);
  }
  async purgeDeletedBefore(iso: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !(r.deletedAt !== null && r.deletedAt < iso));
    return before - this.rows.length;
  }
}
