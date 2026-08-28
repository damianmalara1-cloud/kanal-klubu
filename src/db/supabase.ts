import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '@/domain/types';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { blankPost, type NewPost, type PostsRepo } from './types';

const COLS: Record<keyof Post, string> = {
  id: 'id', createdAt: 'created_at', updatedAt: 'updated_at', author: 'author', type: 'type', form: 'form', photos: 'photos',
  heroPhoto: 'hero_photo', captionAi: 'caption_ai', caption: 'caption', headline: 'headline', kicker: 'kicker', creativePath: 'creative_path',
  regenCount: 'regen_count', factWarning: 'fact_warning', partnerInfo: 'partner_info', status: 'status', reviewToken: 'review_token',
  tgMessageId: 'tg_message_id', reviewerNote: 'reviewer_note', fbPostId: 'fb_post_id', publishedAt: 'published_at', error: 'error',
  purgeAfter: 'purge_after', purgedAt: 'purged_at', ip: 'ip',
};
const TS_COLS = new Set(['created_at', 'updated_at', 'published_at', 'purge_after', 'purged_at']);
const toRow = (p: Partial<Post>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [COLS[k as keyof Post], v]));
const fromRow = (r: Record<string, unknown>): Post =>
  Object.fromEntries(
    Object.entries(COLS).map(([k, col]) => {
      const v = r[col] ?? null;
      return [k, TS_COLS.has(col) ? (v == null ? null : new Date(v as string).toISOString()) : v];
    }),
  ) as unknown as Post;

export class SupabaseRepo implements PostsRepo {
  private sb: SupabaseClient;
  constructor(url: string, key: string) { this.sb = createClient(url, key, { auth: { persistSession: false } }); }
  private q() { return this.sb.from('posts'); }
  async create(p: NewPost) {
    const post = blankPost(newId(), nowIso(), p);
    const { error } = await this.q().insert(toRow(post)); if (error) throw error; return post;
  }
  async get(id: string) {
    const { data, error } = await this.q().select('*').eq('id', id).maybeSingle(); if (error) throw error;
    return data ? fromRow(data) : null;
  }
  async update(id: string, patch: Partial<Post>) {
    const { data, error } = await this.q().update(toRow({ ...patch, updatedAt: patch.updatedAt ?? nowIso() })).eq('id', id).select('*').single();
    if (error) throw error; return fromRow(data);
  }
  async delete(id: string) { const { error } = await this.q().delete().eq('id', id); if (error) throw error; }
  async listByAuthor(author: string, limit: number) {
    const { data, error } = await this.q()
      .select('*')
      .eq('author', author)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit);
    if (error) throw error; return (data ?? []).map(fromRow);
  }
  async countCreatedSince(ip: string, since: string) {
    const { count, error } = await this.q().select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since);
    if (error) throw error; return count ?? 0;
  }
  // liczy po updated_at — świadomie nadlicza, cap kosztów ma być konserwatywny
  async sumGenerationsSince(since: string) {
    const { data, error } = await this.q().select('regen_count').gte('updated_at', since); if (error) throw error;
    return (data ?? []).reduce((s, r) => s + (r.regen_count as number) + 1, 0);
  }
  async listForPurge(now: string) {
    const { data, error } = await this.q().select('*').is('purged_at', null).lte('purge_after', now); if (error) throw error;
    return (data ?? []).map(fromRow);
  }
  async listPendingUnnotified(before: string) {
    const { data, error } = await this.q().select('*').eq('status', 'pending').is('tg_message_id', null).lt('updated_at', before);
    if (error) throw error; return (data ?? []).map(fromRow);
  }
}
