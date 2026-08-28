import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachLinkSecret: 'abcdefghijklmnop', coachNames: ['Ania'] }) }));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '9.9.9.9' }) }));
import { createDraftAction, generateAction, finishAction, listRecentAction, setHeroAction } from './actions';
beforeEach(() => resetAdapters());
const S = 'abcdefghijklmnop';
describe('akcje trenera', () => {
  it('zły sekret → error', async () => { expect(await createDraftAction('zly', { author: 'Ania', type: 'mecz', form: {} })).toEqual({ error: 'Nieprawidłowy link' }); });
  it('pełna ścieżka: draft → generate → finish → lista', async () => {
    const d = await createDraftAction(S, { author: 'Ania', type: 'mecz', form: { opponent: 'X', scoreHome: '24', scoreAway: '18', venue: 'dom' } });
    expect('id' in d).toBe(true); const id = (d as { id: string }).id;
    const g = await generateAction(S, id); expect(g).toMatchObject({ regenCount: 0, canRegen: true }); expect((g as { creativeUrl: string }).creativeUrl).toContain('/api/file/');
    const f = await finishAction(S, id, (g as { caption: string }).caption); expect(f).toEqual({ id });
    const l = await listRecentAction(S, 'Ania'); const items = (l as { items: { id: string; status: string }[] }).items;
    expect(items).toHaveLength(1); expect(items[0]).toMatchObject({ id, status: 'done' });
  });
  it('błąd walidacji → czytelny komunikat', async () => {
    const d = await createDraftAction(S, { author: 'Ania', type: 'mecz', form: { opponent: '' } });
    expect(d).toHaveProperty('error');
    expect((d as { error: string }).error).toMatch(/Uzupełnij wymagane pola/);
  });
  it('finish bez generacji → komunikat z workflow', async () => {
    const d = await createDraftAction(S, { author: 'Ania', type: 'ogloszenie', form: { title: 'Nabór', body: 'Zapraszamy na treningi w środy.' } });
    const f = await finishAction(S, (d as { id: string }).id, 'Zapraszamy na treningi w środy o 17:00.');
    expect(f).toEqual({ error: 'Najpierw wygeneruj post' });
  });
  it('setHeroAction: zły sekret → error; nieznana ścieżka na realnym szkicu → błąd z workflow', async () => {
    expect(await setHeroAction('zly', 'cokolwiek', 'sciezka.jpg')).toEqual({ error: 'Nieprawidłowy link' });
    const d = await createDraftAction(S, { author: 'Ania', type: 'ogloszenie', form: { title: 'Nabór', body: 'Zapraszamy na treningi w środy.' } });
    const r = await setHeroAction(S, (d as { id: string }).id, 'nieznane-zdjecie.jpg');
    expect(r).toEqual({ error: 'Nieznane zdjęcie' });
  });
});
