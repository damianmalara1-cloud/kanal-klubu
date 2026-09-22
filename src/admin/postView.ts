import { FIELD_LABEL } from '@/domain/forms';
import type { PostForm } from '@/domain/types';
import type { AppEvent } from '@/events/types';

/** Pola formularza posta jako [etykieta, wartość] — etykiety te same, które widzi trener (`FIELD_LABEL`). */
export function formEntries(form: PostForm): [string, string][] {
  return Object.entries(form as unknown as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => [FIELD_LABEL[k] ?? k, Array.isArray(v) ? v.join(', ') : String(v)]);
}

export interface AiVersion { at: string; regenNo: number; note: string | null; caption: string | null; costUsd: number | null }

export function aiVersions(events: AppEvent[]): AiVersion[] {
  return events
    .filter((e) => e.type === 'ai_generated')
    .map((e) => ({
      at: e.at,
      regenNo: typeof e.meta.regenNo === 'number' ? e.meta.regenNo : 0,
      note: typeof e.content?.note === 'string' ? e.content.note : null,
      caption: typeof e.content?.caption === 'string' ? e.content.caption : null,
      costUsd: e.costUsd,
    }));
}

export const postCostUsd = (events: AppEvent[]): number =>
  Math.round(events.reduce((s, e) => s + (e.type === 'ai_generated' || e.type === 'ai_failed' ? e.costUsd ?? 0 : 0), 0) * 1e6) / 1e6;
