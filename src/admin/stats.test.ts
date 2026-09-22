import { describe, it, expect } from 'vitest';
import type { AppEvent, EventType } from '@/events/types';
import { monthStats, timeline } from './stats';

let seq = 0;
const ev = (type: EventType, over: Partial<AppEvent> = {}): AppEvent => ({
  id: `e${++seq}`, at: '2026-09-10T10:00:00.000Z', type, author: 'Ania', postId: null, costUsd: null, meta: {}, content: null, ...over,
});
const SEPT = { fromIso: '2026-08-31T22:00:00.000Z', toIso: '2026-09-30T22:00:00.000Z' };
const NOW = '2026-09-22T12:00:00.000Z';

const fixture = (): AppEvent[] => [
  ev('draft_created', { postId: 'p1', at: '2026-09-10T09:00:00.000Z' }),
  ev('ai_generated', { postId: 'p1', costUsd: 0.003, meta: { regen: false } }),
  ev('ai_generated', { postId: 'p1', costUsd: 0.002, meta: { regen: true } }),
  ev('finished', { postId: 'p1', meta: { changedPct: 20 } }),
  ev('draft_created', { postId: 'p2', at: '2026-09-11T09:00:00.000Z' }),
  ev('finished', { postId: 'p2', at: '2026-09-11T10:00:00.000Z', meta: { changedPct: 40 } }),
  ev('draft_created', { postId: 'p3', at: '2026-09-12T09:00:00.000Z' }), // porzucony (bez finished, > 24 h)
  ev('ai_failed', { postId: 'p3', costUsd: 0.001, meta: { reason: 'budget_402', unknownCostCalls: 1 } }),
  ev('draft_created', { author: 'Szymon', postId: 'p4', at: '2026-09-22T11:00:00.000Z' }), // < 24 h — jeszcze nie porzucony
  ev('ai_generated', { author: 'Szymon', postId: 'p4', at: '2026-09-22T11:30:00.000Z', costUsd: 0.004, meta: { regen: false } }),
  ev('admin_login', { author: null, at: '2026-09-22T11:40:00.000Z' }),
];

describe('monthStats', () => {
  it('sumy miesiąca', () => {
    const s = monthStats(fixture(), SEPT, NOW);
    expect(s).toMatchObject({
      costUsd: 0.01, unknownCostCalls: 1, done: 2, abandoned: 1, generations: 3, regens: 1, aiFailures: 1, budgetFailures: 1,
    });
  });

  it('wiersze per trener, bez zdarzeń admina, od najdroższego', () => {
    const s = monthStats(fixture(), SEPT, NOW);
    expect(s.trainers.map((t) => t.author)).toEqual(['Ania', 'Szymon']);
    expect(s.trainers[0]).toMatchObject({ done: 2, abandoned: 1, generations: 2, regens: 1, avgChangedPct: 30, costUsd: 0.006, unknownCostCalls: 1 });
    expect(s.trainers[1]).toMatchObject({ done: 0, abandoned: 0, generations: 1, avgChangedPct: null, costUsd: 0.004, lastAt: '2026-09-22T11:30:00.000Z' });
  });

  it('prognoza: koszt / dni, które minęły × dni miesiąca; minimum 1 dzień; przeszły miesiąc bez prognozy', () => {
    const one = [ev('ai_generated', { costUsd: 0.01 })];
    expect(monthStats(one, SEPT, '2026-09-10T22:00:00.000Z').forecastUsd).toBe(0.03); // 10 z 30 dni
    expect(monthStats(one, SEPT, '2026-09-01T00:00:00.000Z').forecastUsd).toBe(0.3); // 2 h → liczone jako 1 dzień
    expect(monthStats(one, SEPT, '2026-10-05T00:00:00.000Z').forecastUsd).toBeNull();
  });

  it('pusty miesiąc', () => {
    expect(monthStats([], SEPT, NOW)).toMatchObject({ costUsd: 0, done: 0, trainers: [], forecastUsd: 0 });
  });
});

describe('timeline', () => {
  it('filtr trenera i typu, limit, zachowuje kolejność wejścia', () => {
    const f = fixture();
    expect(timeline(f, { author: 'Szymon' }).map((e) => e.type)).toEqual(['draft_created', 'ai_generated']);
    expect(timeline(f, { type: 'finished' })).toHaveLength(2);
    expect(timeline(f, {}, 3)).toHaveLength(3);
  });
});
