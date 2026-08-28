import type { Post, PostForm, PostType } from '@/domain/types';

export interface NewPost { author: string; type: PostType; form: PostForm; ip: string | null; partnerInfo: boolean; purgeAfter: string }

export interface PostsRepo {
  create(p: NewPost): Promise<Post>;
  get(id: string): Promise<Post | null>;
  update(id: string, patch: Partial<Post>): Promise<Post>;
  delete(id: string): Promise<void>;
  listByAuthor(author: string, limit: number): Promise<Post[]>;
  countCreatedSince(ip: string, sinceIso: string): Promise<number>;
  sumGenerationsSince(sinceIso: string): Promise<number>;
  listForPurge(nowIso: string): Promise<Post[]>;
}

export function blankPost(id: string, now: string, p: NewPost): Post {
  return {
    id, createdAt: now, updatedAt: now, author: p.author, type: p.type, form: structuredClone(p.form),
    photos: [], heroPhoto: null, captionAi: null, caption: null, headline: null, kicker: null,
    creativePath: null, regenCount: 0, factWarning: null, partnerInfo: p.partnerInfo,
    status: 'draft', purgeAfter: p.purgeAfter, purgedAt: null, ip: p.ip,
  };
}

export const COLS: Record<keyof Post, string> = {
  id: 'id', createdAt: 'created_at', updatedAt: 'updated_at', author: 'author', type: 'type', form: 'form',
  photos: 'photos', heroPhoto: 'hero_photo', captionAi: 'caption_ai', caption: 'caption', headline: 'headline', kicker: 'kicker',
  creativePath: 'creative_path', regenCount: 'regen_count', factWarning: 'fact_warning', partnerInfo: 'partner_info', status: 'status',
  purgeAfter: 'purge_after', purgedAt: 'purged_at', ip: 'ip',
};
