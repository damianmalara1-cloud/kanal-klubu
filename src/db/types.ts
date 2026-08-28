import type { Post, PostForm, PostType } from '@/domain/types';

export interface NewPost { author: string; type: PostType; form: PostForm; ip: string | null; partnerInfo: boolean; reviewToken: string; purgeAfter: string }

export interface PostsRepo {
  create(p: NewPost): Promise<Post>;
  get(id: string): Promise<Post | null>;
  update(id: string, patch: Partial<Post>): Promise<Post>;
  delete(id: string): Promise<void>;
  listByAuthor(author: string, limit: number): Promise<Post[]>;
  countCreatedSince(ip: string, sinceIso: string): Promise<number>;
  sumGenerationsSince(sinceIso: string): Promise<number>;
  listForPurge(nowIso: string): Promise<Post[]>;
  listPendingUnnotified(beforeIso: string): Promise<Post[]>;
}

export function blankPost(id: string, now: string, p: NewPost): Post {
  return {
    id, createdAt: now, updatedAt: now, author: p.author, type: p.type, form: p.form,
    photos: [], heroPhoto: null, captionAi: null, caption: null, headline: null, kicker: null,
    creativePath: null, regenCount: 0, factWarning: null, partnerInfo: p.partnerInfo,
    status: 'draft', reviewToken: p.reviewToken, tgMessageId: null, reviewerNote: null,
    fbPostId: null, publishedAt: null, error: null, purgeAfter: p.purgeAfter, purgedAt: null, ip: p.ip,
  };
}
