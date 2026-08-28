import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';

// Flaga w osobnym obiekcie (nie zwykłym `let`) — `vi.mock` poniżej jest hoisted ponad zwykłe deklaracje,
// więc żeby móc przełączać `partnerInfoEnabled` per test, referencja musi istnieć zanim mock zostanie
// zarejestrowany. `getConfig()` czyta `flags.partnerInfoEnabled` na żywo przy każdym wywołaniu.
const { flags } = vi.hoisted(() => ({ flags: { partnerInfoEnabled: true } }));

vi.mock('@/config', () => ({
  getConfig: () =>
    testConfig({ coachNames: ['Ania'], teams: [], klubProTeams: ['młodziczki (2011+)'], partnerInfoEnabled: flags.partnerInfoEnabled }),
}));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));

import { getRepo } from '@/db';
import { renderCreative } from '@/creative';
import { createDraft } from './draft';
import { generate, MAX_REGEN } from './generate';

beforeEach(() => {
  resetAdapters();
  vi.mocked(renderCreative).mockClear();
  flags.partnerInfoEnabled = true;
});

const draft = () =>
  createDraft({
    author: 'Ania',
    type: 'mecz',
    ip: null,
    form: { team: 'dziewczęta 2013+', opponent: 'Sokół Gdańsk', scoreHome: '24', scoreAway: '18', venue: 'dom' },
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

  it('limit regeneracji trenera: pierwsza generacja gratis, potem MAX_REGEN prób', async () => {
    const d = await draft();
    await generate(d.id);
    for (let i = 0; i < MAX_REGEN; i++) await generate(d.id, 'krócej');
    await expect(generate(d.id, 'x')).rejects.toThrow(/Limit/);
    await expect(generate(d.id, 'x')).rejects.toThrow(/kliknij Gotowe/);
  });

  it('post po „Gotowe" jest zamknięty — regeneracja odrzucona', async () => {
    const d = await draft();
    await generate(d.id);
    await getRepo().update(d.id, { status: 'done' });
    await expect(generate(d.id, 'x')).rejects.toThrow(/Post jest już zakończony/);
    await expect(generate(d.id, 'x')).rejects.toMatchObject({ status: 409 });
  });

  it('partnerBand: włączony gdy partnerInfoEnabled=true i drużyna w KLUB PRO, wyłączony przez globalny kill-switch', async () => {
    const d = await createDraft({
      author: 'Ania',
      type: 'mecz',
      ip: null,
      form: { team: 'młodziczki (2011+)', opponent: 'Sokół Gdańsk', scoreHome: '24', scoreAway: '18', venue: 'dom' },
    });
    expect(d.partnerInfo).toBe(true);

    flags.partnerInfoEnabled = true;
    await generate(d.id);
    expect(renderCreative).toHaveBeenLastCalledWith(expect.objectContaining({ id: d.id }), null, { partnerBand: true });

    flags.partnerInfoEnabled = false;
    await generate(d.id, 'x');
    expect(renderCreative).toHaveBeenLastCalledWith(expect.objectContaining({ id: d.id }), null, { partnerBand: false });
  });

  it('globalny limit 60 wywołań modelu/h blokuje trenera', async () => {
    const repo = getRepo();
    for (let i = 0; i < 20; i++) {
      const seed = await createDraft({
        author: 'Ania',
        type: 'mecz',
        ip: null,
        form: { team: 'dziewczęta 2013+', opponent: `Rywal ${i}`, scoreHome: '1', scoreAway: '0', venue: 'dom' },
      });
      // regenCount 2 → sumGenerationsSince liczy (regenCount+1) na wpis; 20 × 3 = 60 ≥ MODEL_CALLS_PER_HOUR.
      // captionAi musi być niepuste — szkice bez generacji nie wliczają się do limitu (patrz memory.test.ts).
      await repo.update(seed.id, { regenCount: 2, captionAi: 'wygenerowany tekst' });
    }
    const d = await draft();
    await expect(generate(d.id)).rejects.toThrow(/Za dużo/);
  });
});
