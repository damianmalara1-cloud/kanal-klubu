import sharp from 'sharp';
import { getConfig } from '@/config';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { formTeam, parseForm } from '@/domain/forms';
import type { Post, PostType } from '@/domain/types';
import { AppError } from '@/lib/errors';
import { newToken } from '@/lib/ids';
import { nowIso, plusHours } from '@/lib/dates';

export const MAX_PHOTOS = 10;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const DRAFTS_PER_HOUR_PER_IP = 20;

export async function createDraft(input: { author: string; type: PostType; form: unknown; ip: string | null }): Promise<Post> {
  const c = getConfig();
  const repo = getRepo();
  if (!c.coachNames.includes(input.author)) throw new AppError('Nieznany trener — wybierz imię z listy', 400);
  const form = parseForm(input.type, input.form);
  if (input.ip && (await repo.countCreatedSince(input.ip, plusHours(nowIso(), -1))) >= DRAFTS_PER_HOUR_PER_IP) {
    throw new AppError('Za dużo prób, spróbuj za chwilę', 429);
  }
  const team = formTeam(form);
  return repo.create({
    author: input.author,
    type: input.type,
    form,
    ip: input.ip,
    partnerInfo: team !== null && c.klubProTeams.includes(team),
    reviewToken: newToken(),
    purgeAfter: plusHours(nowIso(), 24),
  });
}

async function draftOr404(id: string): Promise<Post> {
  const post = await getRepo().get(id);
  if (!post || post.status !== 'draft') throw new AppError('Zgłoszenie nie istnieje albo zostało już wysłane', 404);
  return post;
}

export async function attachPhoto(id: string, file: Buffer): Promise<{ path: string; post: Post }> {
  const post = await draftOr404(id);
  if (post.photos.length >= MAX_PHOTOS) throw new AppError(`Maksymalnie ${MAX_PHOTOS} zdjęć`, 400);
  if (file.length > MAX_UPLOAD_BYTES) throw new AppError('Zdjęcie jest za duże (max 4 MB)', 413);
  let jpg: Buffer;
  try {
    jpg = await sharp(file)
      .rotate() // koryguje orientację EXIF przed resize, żeby zapisany plik nie zależał od tagu, który dalej i tak wycinamy
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new AppError('To nie jest obsługiwane zdjęcie', 400);
  }
  const path = `${id}/photo-${post.photos.length + 1}.jpg`;
  await getStorage().put(path, jpg, 'image/jpeg');
  const updated = await getRepo().update(id, { photos: [...post.photos, path], heroPhoto: post.heroPhoto ?? path });
  return { path, post: updated };
}

export async function setHeroPhoto(id: string, path: string): Promise<Post> {
  const post = await draftOr404(id);
  if (!post.photos.includes(path)) throw new AppError('Nieznane zdjęcie', 400);
  return getRepo().update(id, { heroPhoto: path });
}
