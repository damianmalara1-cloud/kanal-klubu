import type { AppEvent } from '@/events/types';

const DAY = 86_400_000;
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

export interface TrainerRow {
  author: string; done: number; abandoned: number; generations: number; regens: number;
  avgChangedPct: number | null; costUsd: number; unknownCostCalls: number; lastAt: string;
}

export interface MonthStats {
  costUsd: number; unknownCostCalls: number; forecastUsd: number | null;
  done: number; abandoned: number; generations: number; regens: number;
  aiFailures: number; budgetFailures: number; trainers: TrainerRow[];
}

/** Szkic porzucony = `draft_created` bez `finished` na tym samym poście, starszy niż 24 h (wcześniej trener może wrócić).
 * Liczone w obrębie przekazanych zdarzeń: szkic z ostatniej doby miesiąca skończony w następnym liczy się jako porzucony
 * (świadome uproszczenie). */
function abandonedPosts(events: AppEvent[], nowMs: number): Set<string> {
  const finished = new Set(events.filter((e) => e.type === 'finished' && e.postId).map((e) => e.postId as string));
  return new Set(
    events
      .filter((e) => e.type === 'draft_created' && e.postId && !finished.has(e.postId) && nowMs - Date.parse(e.at) > DAY)
      .map((e) => e.postId as string),
  );
}

function summarize(es: AppEvent[], abandoned: Set<string>) {
  const ai = es.filter((e) => e.type === 'ai_generated' || e.type === 'ai_failed');
  const gens = es.filter((e) => e.type === 'ai_generated');
  const fin = es.filter((e) => e.type === 'finished');
  return {
    costUsd: round6(ai.reduce((s, e) => s + (e.costUsd ?? 0), 0)),
    unknownCostCalls: ai.reduce((s, e) => s + num(e.meta.unknownCostCalls), 0),
    generations: gens.length,
    regens: gens.filter((e) => e.meta.regen === true).length,
    done: fin.length,
    abandoned: es.filter((e) => e.type === 'draft_created' && e.postId !== null && abandoned.has(e.postId)).length,
    avgChangedPct: fin.length ? Math.round(fin.reduce((s, e) => s + num(e.meta.changedPct), 0) / fin.length) : null,
  };
}

export function monthStats(events: AppEvent[], range: { fromIso: string; toIso: string }, nowIso: string): MonthStats {
  const nowMs = Date.parse(nowIso);
  const abandoned = abandonedPosts(events, nowMs);
  const byAuthor = new Map<string, AppEvent[]>();
  for (const e of events) if (e.author) byAuthor.set(e.author, [...(byAuthor.get(e.author) ?? []), e]);

  const total = summarize(events, abandoned);
  const fromMs = Date.parse(range.fromIso), toMs = Date.parse(range.toIso);
  const isCurrent = nowMs >= fromMs && nowMs < toMs;
  const elapsedDays = Math.max((nowMs - fromMs) / DAY, 1);
  const monthDays = Math.round((toMs - fromMs) / DAY);

  const trainers: TrainerRow[] = [...byAuthor.entries()]
    .map(([author, es]) => {
      const s = summarize(es, abandoned);
      return {
        author, done: s.done, abandoned: s.abandoned, generations: s.generations, regens: s.regens,
        avgChangedPct: s.avgChangedPct, costUsd: s.costUsd, unknownCostCalls: s.unknownCostCalls,
        lastAt: es.reduce((m, e) => (e.at > m ? e.at : m), ''),
      };
    })
    .sort((a, b) => b.costUsd - a.costUsd || b.lastAt.localeCompare(a.lastAt));

  const failures = events.filter((e) => e.type === 'ai_failed');
  return {
    costUsd: total.costUsd,
    unknownCostCalls: total.unknownCostCalls,
    forecastUsd: isCurrent ? round6((total.costUsd / elapsedDays) * monthDays) : null,
    done: total.done, abandoned: total.abandoned, generations: total.generations, regens: total.regens,
    aiFailures: failures.length,
    budgetFailures: failures.filter((e) => e.meta.reason === 'budget_402').length,
    trainers,
  };
}

/** Oś zdarzeń pulpitu: filtr trenera/typu na liście już posortowanej od najnowszego. */
export function timeline(events: AppEvent[], f: { author?: string; type?: string }, limit = 50): AppEvent[] {
  return events.filter((e) => (!f.author || e.author === f.author) && (!f.type || e.type === f.type)).slice(0, limit);
}
