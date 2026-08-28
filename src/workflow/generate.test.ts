import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';

vi.mock('@/config', () => ({
  getConfig: () => testConfig({ coachNames: ['Ania'], teams: [], klubProTeams: [], partnerInfoEnabled: true }),
}));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));

import { renderCreative } from '@/creative';
import { createDraft } from './draft';
import { generate, MAX_REGEN } from './generate';

beforeEach(() => {
  resetAdapters();
  vi.mocked(renderCreative).mockClear();
});

const draft = () =>
  createDraft({
    author: 'Ania',
    type: 'mecz',
    ip: null,
    form: { team: null, opponent: 'Sokół Gdańsk', scoreHome: '24', scoreAway: '18', venue: 'dom' },
  });

describe('generate', () => {
  it('zapisuje tekst, headline = wynik, planszę; pierwsza generacja nie liczy się do regen', async () => {
    const d = await draft();
    const p = await generate(d.id);
    expect(p.caption).toContain('24 : 18');
    expect(p.headline).toBe('24 : 18');
    expect(p.creativePath).toBe(`${d.id}/creative.png`);
    expect(p.regenCount).toBe(0);
    expect(renderCreative).toHaveBeenCalledWith(expect.objectContaining({ id: d.id }), null, { partnerBand: false });
  });

  it('limit regeneracji dla trenera, brak limitu dla recenzenta', async () => {
    const d = await draft();
    await generate(d.id);
    for (let i = 0; i < MAX_REGEN; i++) await generate(d.id, 'krócej');
    await expect(generate(d.id, 'x')).rejects.toThrow(/Limit/);
    expect((await generate(d.id, 'x', { byReviewer: true })).regenCount).toBe(MAX_REGEN + 1);
  });
});
