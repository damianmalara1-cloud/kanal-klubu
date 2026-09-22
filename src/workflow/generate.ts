import { getConfig } from '@/config';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { recordEvent } from '@/events';
import { generateCaption, type Generated } from '@/ai/generate';
import { AiMeter } from '@/ai/meter';
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

/** Powód nieudanej generacji do panelu admina (spec §4). 402 z OpenRoutera wraca z `client.ts` jako AppError 503. */
function failReason(e: unknown): 'budget_402' | 'timeout' | 'error' {
  if (e instanceof AppError && e.status === 503) return 'budget_402';
  if (e instanceof Error && e.name === 'AbortError') return 'timeout';
  return 'error';
}

/**
 * Generuje/regeneruje tekst (AI) i planszę dla posta. Pierwsza generacja (`captionAi === null`) nie liczy się
 * do limitu regeneracji trenera — dopiero druga i kolejne próby na tym samym poście są „regeneracją" i podlegają
 * `MAX_REGEN`. Post po „Gotowe" (`status === 'done'`) jest zamknięty: trener kopiuje tekst i publikuje sam,
 * nie ma już czego regenerować. Każda próba (udana i nieudana) trafia do dziennika z kosztem (spec §4-5).
 */
export async function generate(id: string, note?: string): Promise<Post> {
  const repo = getRepo();
  const post = await postOr404(id);
  if (post.status !== 'draft') throw new AppError(MSG_POST_DONE, 409);
  const isRegen = post.captionAi !== null;
  if (isRegen && post.regenCount >= MAX_REGEN) {
    await recordEvent({ type: 'limit_hit', author: post.author, postId: id, meta: { limit: 'max_regen' } });
    throw new AppError(`Limit ${MAX_REGEN} prób na post — popraw tekst ręcznie albo kliknij Gotowe`, 429);
  }
  if ((await repo.sumGenerationsSince(plusHours(nowIso(), -1))) >= MODEL_CALLS_PER_HOUR) {
    await recordEvent({ type: 'limit_hit', author: post.author, postId: id, meta: { limit: 'model_calls_hour' } });
    throw new AppError('Za dużo prób, spróbuj za chwilę', 429);
  }
  const meter = new AiMeter();
  const model = getConfig().aiModel;
  const t0 = Date.now();
  let gen: Generated;
  try {
    gen = await generateCaption(post, note, meter);
  } catch (e) {
    const { costUsd, ...counts } = meter.snapshot();
    await recordEvent({
      type: 'ai_failed', author: post.author, postId: id, costUsd,
      meta: { regen: isRegen, ...counts, ms: Date.now() - t0, model, reason: failReason(e) },
      content: note ? { note } : null,
    });
    throw e;
  }
  const regenCount = isRegen ? post.regenCount + 1 : post.regenCount;
  await repo.update(id, {
    captionAi: gen.caption,
    caption: gen.caption,
    headline: gen.headline,
    kicker: gen.kicker,
    factWarning: gen.factWarning,
    regenCount,
  });
  const { costUsd, ...counts } = meter.snapshot();
  await recordEvent({
    type: 'ai_generated', author: post.author, postId: id, costUsd,
    meta: { regen: isRegen, regenNo: isRegen ? regenCount : 0, ...counts, ms: Date.now() - t0, model, factWarning: gen.factWarning !== null },
    content: { note: note ?? null, caption: gen.caption, headline: gen.headline, kicker: gen.kicker },
  });
  return rerenderCreative(id);
}
