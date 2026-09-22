import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachNames: ['Ania'] }) }));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));
vi.mock('@/ai/generate', () => ({ generateCaption: vi.fn() }));

import { generateCaption } from '@/ai/generate';
import type { AiMeter } from '@/ai/meter';
import { getEvents } from '@/events';
import { AppError } from '@/lib/errors';
import { createDraft } from './draft';
import { generate } from './generate';

beforeEach(() => { resetAdapters(); vi.mocked(generateCaption).mockReset(); });

const draft = () => createDraft({ author: 'Ania', type: 'mecz', ip: null, form: { team: 'dziewczęta 2013+', opponent: 'Sokół Gdańsk', scoreHome: '24', scoreAway: '18', venue: 'dom' } });
const failed = async () => (await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z')).find((e) => e.type === 'ai_failed');

describe('generate — ai_failed', () => {
  it('brak środków (402 → AppError 503) → reason budget_402, błąd leci dalej do trenera', async () => {
    vi.mocked(generateCaption).mockImplementation(async (_p, _n, meter?: AiMeter) => {
      meter?.failed();
      throw new AppError('Skończył się budżet AI — daj znać Damianowi', 503);
    });
    const d = await draft();
    await expect(generate(d.id)).rejects.toMatchObject({ status: 503 });
    expect(await failed()).toMatchObject({ author: 'Ania', postId: d.id, costUsd: 0, meta: { reason: 'budget_402', regen: false, calls: 1, failedCalls: 1 }, content: null });
  });

  it('timeout → reason timeout, notatka trenera w treści', async () => {
    vi.mocked(generateCaption).mockImplementation(async (_p, _n, meter?: AiMeter) => {
      meter?.unknown();
      throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    });
    const d = await draft();
    await expect(generate(d.id, 'dopisz bramkarkę')).rejects.toThrow(/aborted/);
    expect(await failed()).toMatchObject({ meta: { reason: 'timeout', unknownCostCalls: 1 }, content: { note: 'dopisz bramkarkę' } });
  });

  it('wywołanie zapłacone, potem padło parsowanie → koszt zapisany mimo błędu', async () => {
    vi.mocked(generateCaption).mockImplementation(async (_p, _n, meter?: AiMeter) => {
      meter?.ok({ promptTokens: 1500, completionTokens: 300, costUsd: 0.003 });
      throw new Error('Model zwrócił nie-JSON');
    });
    const d = await draft();
    await expect(generate(d.id)).rejects.toThrow(/nie-JSON/);
    expect(await failed()).toMatchObject({ costUsd: 0.003, meta: { reason: 'error', calls: 1, promptTokens: 1500 } });
  });
});
