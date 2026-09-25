import type { CalEvent, CalPatchFields } from '@/domain/calendar';

export interface NewCalEvent extends CalPatchFields { seriesId: string | null; by: string }
export type CalPatch = Partial<CalPatchFields & { seriesId: string | null }>;

export interface CalendarRepo {
  /** Dyskryminator adaptera — NIGDY `instanceof` (patrz `storage/types.ts`). */
  readonly kind: 'memory' | 'supabase';
  create(e: NewCalEvent): Promise<CalEvent>;
  createMany(rows: NewCalEvent[]): Promise<CalEvent[]>;
  get(id: string): Promise<CalEvent | null>;
  listRange(fromIso: string, toIso: string, team?: string | null): Promise<CalEvent[]>;
  listSeriesFrom(seriesId: string, fromIso: string): Promise<CalEvent[]>;
  update(id: string, patch: CalPatch, by: string): Promise<CalEvent>;
  updateMany(ids: string[], patch: CalPatch, by: string): Promise<number>;
  softDelete(ids: string[], by: string, atIso: string): Promise<number>;
  restore(ids: string[], by: string): Promise<number>;
  listDeleted(): Promise<CalEvent[]>;
  purgeDeletedBefore(iso: string): Promise<number>;
}

export const CAL_COLS: Record<keyof CalEvent, string> = {
  id: 'id', type: 'type', teams: 'teams', title: 'title', startsAt: 'starts_at', endsAt: 'ends_at', allDay: 'all_day',
  place: 'place', coaches: 'coaches', details: 'details', seriesId: 'series_id', createdBy: 'created_by', updatedBy: 'updated_by',
  createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at', deletedBy: 'deleted_by',
};
