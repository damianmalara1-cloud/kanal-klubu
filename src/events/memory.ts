import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { EVENTS_LIST_CAP, type AppEvent, type EventType, type EventsRepo, type NewEvent } from './types';

const clone = (e: AppEvent): AppEvent => structuredClone(e);
/** Od najnowszego; przy równym `at` najpóźniej zapisane pierwsze (odwrócenie + stabilny sort). */
const newestFirst = (rows: AppEvent[]) => [...rows].reverse().sort((a, b) => b.at.localeCompare(a.at));

export class MemoryEvents implements EventsRepo {
  readonly kind = 'memory' as const;
  constructor(private rows: AppEvent[] = []) {}

  async add(e: NewEvent) {
    this.rows.push({
      id: newId(),
      at: e.at ?? nowIso(),
      type: e.type,
      author: e.author ?? null,
      postId: e.postId ?? null,
      costUsd: e.costUsd ?? null,
      meta: structuredClone(e.meta ?? {}),
      content: e.content ? structuredClone(e.content) : null,
    });
  }

  async listRange(fromIso: string, toIso: string, limit = EVENTS_LIST_CAP) {
    return newestFirst(this.rows.filter((r) => r.at >= fromIso && r.at < toIso)).slice(0, limit).map(clone);
  }

  async listByPost(postId: string) {
    return this.rows.filter((r) => r.postId === postId).sort((a, b) => a.at.localeCompare(b.at)).map(clone);
  }

  async countSince(type: EventType, sinceIso: string, ip?: string) {
    return this.rows.filter((r) => r.type === type && r.at >= sinceIso && (ip === undefined || r.meta.ip === ip)).length;
  }

  async clearContent(postId: string) {
    return this.clearWhere((r) => r.postId === postId);
  }

  async clearContentBefore(iso: string) {
    return this.clearWhere((r) => r.at < iso);
  }

  async deleteBefore(type: EventType | null, iso: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !(r.at < iso && (type === null || r.type === type)));
    return before - this.rows.length;
  }

  private clearWhere(pred: (r: AppEvent) => boolean) {
    let n = 0;
    for (const r of this.rows) {
      if (r.content !== null && pred(r)) { r.content = null; n++; }
    }
    return n;
  }
}
