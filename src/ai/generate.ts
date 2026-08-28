import type { MeczForm, Post } from '@/domain/types';
import { log } from '@/lib/log';
import { callModel } from './client';
import { checkFacts } from './factGuard';
import { parseModelJson, type ModelOut } from './parse';
import { cleanCaption } from './postprocess';
import { buildSystemPrompt, buildUserPrompt } from './prompt';

export interface Generated { caption: string; headline: string; kicker: string; factWarning: string | null }

async function once(system: string, user: string): Promise<ModelOut> {
  try { return parseModelJson(await callModel(system, user)); }
  catch (e) { log.warn('ai: pierwsza próba nieudana, ponawiam', { err: String(e) }); return parseModelJson(await callModel(system, user)); }
}

export async function generateCaption(post: Post, note?: string): Promise<Generated> {
  const system = buildSystemPrompt();
  let out = await once(system, buildUserPrompt(post, note));
  let warning = checkFacts(post, out.caption);
  if (warning) {
    out = await once(system, buildUserPrompt(post, `${note ?? ''}\nPoprzednia wersja pominęła: ${warning}. Popraw to.`.trim()));
    warning = checkFacts(post, out.caption);
  }
  const headline = post.type === 'mecz' ? `${(post.form as MeczForm).scoreHome} : ${(post.form as MeczForm).scoreAway}` : out.headline;
  return { caption: cleanCaption(out.caption), headline, kicker: out.kicker, factWarning: warning };
}
