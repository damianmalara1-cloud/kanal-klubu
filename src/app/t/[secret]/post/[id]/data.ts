import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { SIGNED_URL_TTL_S } from '@/storage/types';
import { postTitle } from '@/domain/forms';
import type { PostType } from '@/domain/types';
import { isValidSecret } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { finalText } from '@/workflow/finish';

export interface ReadyData {
  id: string; type: PostType; title: string; text: string; createdAt: string;
  creativeUrl: string | null;
  downloadCreativeUrl: string | null;
  photoDownloads: { label: string; url: string }[];
}

/** Dane ekranu „Gotowe”. Tylko posty `done` z plikami; po purge (7 dni) → 404. */
export async function loadReady(secret: string, id: string): Promise<ReadyData> {
  if (!isValidSecret(secret)) throw new AppError('Nieprawidłowy link', 404);
  const post = await getRepo().get(id);
  if (!post || post.status !== 'done' || post.purgedAt) throw new AppError('Nie znaleziono posta', 404);
  const q = `?secret=${encodeURIComponent(secret)}`;
  return {
    id: post.id, type: post.type, title: postTitle(post), text: finalText(post), createdAt: post.createdAt,
    creativeUrl: post.creativePath ? await getStorage().signedUrl(post.creativePath, SIGNED_URL_TTL_S) : null,
    downloadCreativeUrl: post.creativePath ? `/api/download/${post.id}/plansza${q}` : null,
    photoDownloads: post.photos.map((_, i) => ({ label: `Zdjęcie ${i + 1}`, url: `/api/download/${post.id}/zdjecie-${i + 1}${q}` })),
  };
}
