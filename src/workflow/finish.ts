import { getConfig } from '@/config';
import { getRepo } from '@/db';
import { cleanCaption, finalizeCaption } from '@/ai/postprocess';
import type { Post } from '@/domain/types';
import { nowIso, plusDays } from '@/lib/dates';
import { AppError } from '@/lib/errors';

export const MIN_CAPTION = 20;
export const DONE_RETENTION_DAYS = 7; // po decyzji trenera pliki żyją 7 dni (dane dzieci nie leżą bezterminowo)

/** Trener kończy post: zapisujemy oczyszczony tekst, status done, termin kasowania plików. */
export async function finish(id: string, caption: string): Promise<Post> {
  const repo = getRepo();
  const post = await repo.get(id);
  if (!post) throw new AppError('Nie znaleziono posta', 404);
  if (post.status !== 'draft') throw new AppError('Ten post jest już gotowy', 409);
  if (!post.creativePath) throw new AppError('Najpierw wygeneruj post', 409);
  const clean = cleanCaption(caption);
  if (clean.length < MIN_CAPTION) throw new AppError(`Tekst jest za krótki (min. ${MIN_CAPTION} znaków)`, 400);
  const now = nowIso();
  return repo.update(id, { caption: clean, status: 'done', updatedAt: now, purgeAfter: plusDays(now, DONE_RETENTION_DAYS) });
}

/** Tekst do skopiowania: caption + hashtagi + stopka KLUB PRO (gdy flaga globalna i post objęty programem). */
export function finalText(post: Post): string {
  return finalizeCaption(post.caption ?? '', { partnerInfo: getConfig().partnerInfoEnabled && post.partnerInfo });
}
