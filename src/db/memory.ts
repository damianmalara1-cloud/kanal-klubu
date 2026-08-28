import type { Post } from '@/domain/types';
import { newId } from '@/lib/ids';
import { nowIso } from '@/lib/dates';
import { blankPost, type NewPost, type PostsRepo } from './types';

export class MemoryRepo implements PostsRepo {
  constructor(private rows: Map<string, Post> = new Map()) {}
  async create(p: NewPost) { const post = blankPost(newId(), nowIso(), p); this.rows.set(post.id, post); return { ...post }; }
  async get(id: string) { const row = this.rows.get(id); return row ? { ...row } : null; }
  async update(id: string, patch: Partial<Post>) {
    const cur = this.rows.get(id); if (!cur) throw new Error(`post ${id} nie istnieje`);
    const next = { ...cur, ...patch, updatedAt: patch.updatedAt ?? nowIso() }; this.rows.set(id, next); return { ...next };
  }
  async delete(id: string) { this.rows.delete(id); }
  async listByAuthor(author: string, limit: number) {
    return [...this.rows.values()]
      .filter((p) => p.author === author && p.status !== 'draft')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .slice(0, limit)
      .map((p) => ({ ...p }));
  }
  async countCreatedSince(ip: string, since: string) { return [...this.rows.values()].filter((p) => p.ip === ip && p.createdAt >= since).length; }
  // liczy po updated_at — świadomie nadlicza, cap kosztów ma być konserwatywny
  async sumGenerationsSince(since: string) { return [...this.rows.values()].filter((p) => p.updatedAt >= since).reduce((s, p) => s + p.regenCount + 1, 0); }
  async listForPurge(now: string) {
    return [...this.rows.values()].filter((p) => !p.purgedAt && p.purgeAfter && p.purgeAfter <= now).map((p) => ({ ...p }));
  }
}
