'use server';
import { headers } from 'next/headers';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { SIGNED_URL_TTL_S } from '@/storage/types';
import { postTitle } from '@/domain/forms';
import { DEFAULT_CROP, type PhotoCrop, type PhotoStyle, type Post, type PostStatus, type PostType } from '@/domain/types';
import { clientIp, isValidSecret } from '@/lib/access';
import { actionFail } from '@/lib/errors';
import { createDraft, setHeroPhoto } from '@/workflow/draft';
import { generate, MAX_REGEN, setPhotoCrop, setPhotoStyle } from '@/workflow/generate';
import { finish } from '@/workflow/finish';

type Err = { error: string };
const BAD = { error: 'Nieprawidłowy link' } as const;

export async function createDraftAction(secret: string, input: { author: string; type: PostType; form: Record<string, unknown> }): Promise<{ id: string } | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    const p = await createDraft({ ...input, ip: clientIp(await headers()) });
    return { id: p.id };
  } catch (e) {
    return actionFail(e);
  }
}

export async function setHeroAction(secret: string, id: string, path: string): Promise<{ ok: true } | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    await setHeroPhoto(id, path);
    return { ok: true };
  } catch (e) {
    return actionFail(e);
  }
}

/** Adres planszy z wersją z `updatedAt` — plansza leży zawsze pod tą samą ścieżką (`creative.png`), więc bez
 * tego przeglądarka po przełączeniu stylu zdjęcia pokazywałaby starą wersję z cache. */
async function creativeUrlOf(p: Post): Promise<string> {
  if (!p.creativePath) return '';
  const url = await getStorage().signedUrl(p.creativePath, SIGNED_URL_TTL_S);
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.parse(p.updatedAt)}`;
}

type GeneratedOut = { caption: string; creativeUrl: string; factWarning: string | null; regenCount: number; canRegen: boolean; hasPhoto: boolean; photoStyle: PhotoStyle; photoCrop: PhotoCrop };

async function generatedOut(p: Post): Promise<GeneratedOut> {
  return {
    caption: p.caption ?? '', creativeUrl: await creativeUrlOf(p), factWarning: p.factWarning,
    regenCount: p.regenCount, canRegen: p.regenCount < MAX_REGEN, hasPhoto: p.heroPhoto !== null, photoStyle: p.photoStyle, photoCrop: p.photoCrop ?? DEFAULT_CROP,
  };
}

export async function generateAction(secret: string, id: string, note?: string): Promise<GeneratedOut | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    return await generatedOut(await generate(id, note));
  } catch (e) {
    return actionFail(e);
  }
}

export async function setPhotoStyleAction(secret: string, id: string, style: PhotoStyle): Promise<{ creativeUrl: string; photoStyle: PhotoStyle } | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    const p = await setPhotoStyle(id, style);
    return { creativeUrl: await creativeUrlOf(p), photoStyle: p.photoStyle };
  } catch (e) {
    return actionFail(e);
  }
}

export async function setPhotoCropAction(secret: string, id: string, crop: PhotoCrop): Promise<{ creativeUrl: string; photoCrop: PhotoCrop } | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    const p = await setPhotoCrop(id, crop);
    return { creativeUrl: await creativeUrlOf(p), photoCrop: p.photoCrop };
  } catch (e) {
    return actionFail(e);
  }
}

export async function finishAction(secret: string, id: string, caption: string): Promise<{ id: string } | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    const p = await finish(id, caption);
    return { id: p.id };
  } catch (e) {
    return actionFail(e);
  }
}

export async function listRecentAction(
  secret: string,
  author: string,
): Promise<{ items: { id: string; title: string; type: PostType; status: PostStatus; createdAt: string }[] } | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    const items = (await getRepo().listByAuthor(author, 5)).map((p) => ({ id: p.id, title: postTitle(p), type: p.type, status: p.status, createdAt: p.createdAt }));
    return { items };
  } catch (e) {
    return actionFail(e);
  }
}
