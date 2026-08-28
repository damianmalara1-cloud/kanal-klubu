import { getConfig } from '@/config';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { generateCaption } from '@/ai/generate';
import { renderCreative } from '@/creative';
import { MSG_POST_DONE, MSG_POST_NOT_FOUND } from '@/domain/messages';
import type { Post } from '@/domain/types';
import { AppError } from '@/lib/errors';
import { nowIso, plusHours } from '@/lib/dates';

export const MAX_REGEN = 3;
export const MODEL_CALLS_PER_HOUR = 60;

async function postOr404(id: string): Promise<Post> {
  const post = await getRepo().get(id);
  if (!post) throw new AppError(MSG_POST_NOT_FOUND, 404);
  return post;
}

/** Renderuje planszę dla aktualnego stanu posta i zapisuje ją do storage. Wydzielone z `generate` dla
 * czytelności — jedynym wywołującym jest `generate` (żaden przepływ nie renderuje planszy bez modelu). */
async function rerenderCreative(id: string): Promise<Post> {
  const c = getConfig();
  const repo = getRepo();
  const storage = getStorage();
  const post = await postOr404(id);
  const hero = post.heroPhoto ? await storage.get(post.heroPhoto) : null;
  const png = await renderCreative(post, hero, { partnerBand: c.partnerInfoEnabled && post.partnerInfo });
  const creativePath = `${id}/creative.png`;
  await storage.put(creativePath, png, 'image/png');
  return repo.update(id, { creativePath });
}

/**
 * Generuje/regeneruje tekst (AI) i planszę dla posta. Pierwsza generacja (`captionAi === null`) nie liczy się
 * do limitu regeneracji trenera — dopiero druga i kolejne próby na tym samym poście są „regeneracją" i podlegają
 * `MAX_REGEN`. Post po „Gotowe" (`status === 'done'`) jest zamknięty: trener kopiuje tekst i publikuje sam,
 * nie ma już czego regenerować.
 */
export async function generate(id: string, note?: string): Promise<Post> {
  const repo = getRepo();
  const post = await postOr404(id);
  if (post.status !== 'draft') throw new AppError(MSG_POST_DONE, 409);
  const isRegen = post.captionAi !== null;
  if (isRegen && post.regenCount >= MAX_REGEN) {
    throw new AppError(`Limit ${MAX_REGEN} prób na post — popraw tekst ręcznie albo kliknij Gotowe`, 429);
  }
  if ((await repo.sumGenerationsSince(plusHours(nowIso(), -1))) >= MODEL_CALLS_PER_HOUR) {
    throw new AppError('Za dużo prób, spróbuj za chwilę', 429);
  }
  const gen = await generateCaption(post, note);
  await repo.update(id, {
    captionAi: gen.caption,
    caption: gen.caption,
    headline: gen.headline,
    kicker: gen.kicker,
    factWarning: gen.factWarning,
    regenCount: isRegen ? post.regenCount + 1 : post.regenCount,
  });
  return rerenderCreative(id);
}
