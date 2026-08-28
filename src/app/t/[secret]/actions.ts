'use server';
import { headers } from 'next/headers';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { SIGNED_URL_TTL_S } from '@/storage/types';
import { postTitle } from '@/domain/forms';
import type { PostStatus, PostType } from '@/domain/types';
import { clientIp, isValidSecret } from '@/lib/access';
import { actionFail } from '@/lib/errors';
import { createDraft, setHeroPhoto } from '@/workflow/draft';
import { generate, MAX_REGEN } from '@/workflow/generate';
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

export async function generateAction(
  secret: string,
  id: string,
  note?: string,
): Promise<{ caption: string; creativeUrl: string; factWarning: string | null; regenCount: number; canRegen: boolean } | Err> {
  if (!isValidSecret(secret)) return BAD;
  try {
    const p = await generate(id, note);
    const creativeUrl = p.creativePath ? await getStorage().signedUrl(p.creativePath, SIGNED_URL_TTL_S) : '';
    return { caption: p.caption ?? '', creativeUrl, factWarning: p.factWarning, regenCount: p.regenCount, canRegen: p.regenCount < MAX_REGEN };
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
