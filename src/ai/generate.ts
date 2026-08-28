import type { MeczForm, Post } from '@/domain/types';
import { log } from '@/lib/log';
import { callModel } from './client';
import { checkFacts } from './factGuard';
import { parseModelJson, type ModelOut } from './parse';
import { cleanCaption } from './postprocess';
import { buildSystemPrompt, buildUserPrompt } from './prompt';

export interface Generated { caption: string; headline: string; kicker: string; factWarning: string | null }

// Budżet całkowity generacji (Vercel: 60s) i rezerwa na jedną ostatnią próbę (per-call timeout w client.ts).
const TOTAL_BUDGET_MS = 45_000;
const RETRY_RESERVE_MS = 15_000;

async function once(system: string, user: string, deadline: number): Promise<ModelOut> {
  try {
    return parseModelJson(await callModel(system, user));
  } catch (e) {
    if (Date.now() > deadline - RETRY_RESERVE_MS) throw e;
    log.warn('ai: pierwsza próba nieudana, ponawiam', { err: String(e) });
    return parseModelJson(await callModel(system, user));
  }
}

export async function generateCaption(post: Post, note?: string): Promise<Generated> {
  const system = buildSystemPrompt();
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  let out = await once(system, buildUserPrompt(post, note), deadline);
  let caption = cleanCaption(out.caption);
  let warning = checkFacts(post, caption);

  if (warning && Date.now() <= deadline - RETRY_RESERVE_MS) {
    out = await once(system, buildUserPrompt(post, `${note ?? ''}\nPoprzednia wersja pominęła: ${warning}. Popraw to.`.trim()), deadline);
    caption = cleanCaption(out.caption);
    warning = checkFacts(post, caption);
  }

  const headline = post.type === 'mecz' ? `${(post.form as MeczForm).scoreHome} : ${(post.form as MeczForm).scoreAway}` : out.headline;
  return { caption, headline, kicker: out.kicker, factWarning: warning };
}
