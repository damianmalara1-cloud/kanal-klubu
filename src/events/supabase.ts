import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { UUID_RE } from '@/lib/ids';
import { EVENTS_LIST_CAP, type AppEvent, type EventType, type EventsRepo, type Json, type NewEvent } from './types';

const fromRow = (r: Record<string, unknown>): AppEvent => ({
  id: String(r.id),
  at: new Date(r.at as string).toISOString(),
  type: r.type as EventType,
  author: (r.author as string | null) ?? null,
  postId: (r.post_id as string | null) ?? null,
  // PostgREST oddaje `numeric` jako liczbę JSON, ale nie polegamy na tym przy sumowaniu kosztów
  costUsd: r.cost_usd == null ? null : Number(r.cost_usd),
  meta: (r.meta as Json | null) ?? {},
  content: (r.content as Json | null) ?? null,
});

export class SupabaseEvents implements EventsRepo {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;
  constructor(url: string, key: string) { this.sb = createClient(url, key, { auth: { persistSession: false } }); }
  private q() { return this.sb.from('events'); }

  async add(e: NewEvent) {
    const { error } = await this.q().insert({
      type: e.type,
      author: e.author ?? null,
      post_id: e.postId ?? null,
      cost_usd: e.costUsd ?? null,
      meta: e.meta ?? {},
      content: e.content ?? null,
      ...(e.at ? { at: e.at } : {}),
    });
    if (error) throw error;
  }

  async listRange(fromIso: string, toIso: string, limit = EVENTS_LIST_CAP) {
    const { data, error } = await this.q().select('*').gte('at', fromIso).lt('at', toIso)
      .order('at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map(fromRow);
  }

  async listByPost(postId: string) {
    if (!UUID_RE.test(postId)) return [];
    const { data, error } = await this.q().select('*').eq('post_id', postId).order('at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(fromRow);
  }

  async countSince(type: EventType, sinceIso: string, ip?: string) {
    let q = this.q().select('id', { count: 'exact', head: true }).eq('type', type).gte('at', sinceIso);
    if (ip !== undefined) q = q.eq('meta->>ip', ip);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  async clearContent(postId: string) {
    if (!UUID_RE.test(postId)) return 0;
    const { count, error } = await this.q().update({ content: null }, { count: 'exact' })
      .eq('post_id', postId).not('content', 'is', null);
    if (error) throw error;
    return count ?? 0;
  }

  async clearContentBefore(iso: string) {
    const { count, error } = await this.q().update({ content: null }, { count: 'exact' })
      .lt('at', iso).not('content', 'is', null);
    if (error) throw error;
    return count ?? 0;
  }

  async deleteBefore(type: EventType | null, iso: string) {
    let q = this.q().delete({ count: 'exact' }).lt('at', iso);
    if (type !== null) q = q.eq('type', type);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }
}
