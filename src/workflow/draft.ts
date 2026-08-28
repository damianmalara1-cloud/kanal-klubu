import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { getConfig } from '@/config';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { formTeam, parseForm } from '@/domain/forms';
import { MAX_INPUT_PIXELS, MAX_PHOTOS, MAX_UPLOAD_BYTES } from '@/domain/limits';
import { POST_TYPES, type Post, type PostType } from '@/domain/types';
import { AppError } from '@/lib/errors';
import { nowIso, plusHours } from '@/lib/dates';

// Re-eksport: `@/domain/limits` to source of truth (może go czytać też 'use client' PhotoPicker, patrz task-16
// ruling 1) — istniejące `import { attachPhoto, MAX_UPLOAD_BYTES } from '@/workflow/draft'` (upload route + testy)
// działa bez zmian.
export { MAX_PHOTOS, MAX_UPLOAD_BYTES };
export const DRAFTS_PER_HOUR_PER_IP = 20;

export async function createDraft(input: { author: string; type: PostType; form: unknown; ip: string | null }): Promise<Post> {
  const c = getConfig();
  const repo = getRepo();
  if (!c.coachNames.includes(input.author)) throw new AppError('Nieznany trener — wybierz imię z listy', 400);
  // `parseForm` to switch bez default'a — nieznany typ przeszedłby przez niego na `undefined` i padł dopiero
  // w `formTeam` jako TypeError (500). Typ przychodzi z URL-a (`/nowy/[typ]`), więc sprawdzamy go w runtime.
  if (!POST_TYPES.includes(input.type)) throw new AppError('Nieznany typ posta', 400);
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
    purgeAfter: plusHours(nowIso(), 24),
  });
}

async function draftOr404(id: string): Promise<Post> {
  const post = await getRepo().get(id);
  if (!post || post.status !== 'draft') throw new AppError('Post nie istnieje albo jest już zakończony', 404);
  return post;
}

// Kontrakt: klient wysyła zdjęcia SEKWENCYJNIE, jedno `attachPhoto` na raz (wiąże Task 16 — PhotoPicker).
// Ordynał w nazwie (`post.photos.length + 1`) może się powtórzyć przy równoległych wywołaniach na tym samym
// poście — przyrostek losowy w ścieżce chroni tylko przed nadpisaniem cudzego pliku w storage, NIE przed
// niespójnym stanem `photos` w repo (patrz `db/memory.ts` — read-modify-write bez blokady, świadomie poza
// zakresem tego zadania).
export async function attachPhoto(id: string, file: Buffer): Promise<{ path: string; post: Post }> {
  const post = await draftOr404(id);
  if (post.photos.length >= MAX_PHOTOS) throw new AppError(`Maksymalnie ${MAX_PHOTOS} zdjęć`, 400);
  if (file.length > MAX_UPLOAD_BYTES) throw new AppError('Zdjęcie jest za duże (max 4 MB)', 413);
  let jpg: Buffer;
  try {
    jpg = await sharp(file, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // koryguje orientację EXIF przed resize, żeby zapisany plik nie zależał od tagu, który dalej i tak wycinamy
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (e) {
    // Bomba dekompresyjna ma inną przyczynę niż zepsuty plik — trener ma wiedzieć, że to kwestia
    // rozdzielczości, a nie tego, że wybrał zły plik.
    if (/pixel limit/i.test(e instanceof Error ? e.message : '')) {
      throw new AppError('Zdjęcie ma za dużo pikseli — zmniejsz je i spróbuj jeszcze raz', 400);
    }
    throw new AppError('To nie jest obsługiwane zdjęcie', 400);
  }
  const suffix = randomBytes(3).toString('hex');
  const path = `${id}/photo-${post.photos.length + 1}-${suffix}.jpg`;
  await getStorage().put(path, jpg, 'image/jpeg');
  const updated = await getRepo().update(id, { photos: [...post.photos, path], heroPhoto: post.heroPhoto ?? path });
  return { path, post: updated };
}

export async function setHeroPhoto(id: string, path: string): Promise<Post> {
  const post = await draftOr404(id);
  if (!post.photos.includes(path)) throw new AppError('Nieznane zdjęcie', 400);
  return getRepo().update(id, { heroPhoto: path });
}
