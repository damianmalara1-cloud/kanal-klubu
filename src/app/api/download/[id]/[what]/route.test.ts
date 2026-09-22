import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig() }));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));
import { createDraft } from '@/workflow/draft';
import { generate } from '@/workflow/generate';
import { finish } from '@/workflow/finish';
import { getEvents } from '@/events';
import { GET } from './route';

beforeEach(() => resetAdapters());

describe('GET /api/download — dziennik', () => {
  it('pobranie planszy zapisuje zdarzenie downloaded', async () => {
    const d = await createDraft({ author: 'Ania', type: 'mecz', ip: null, form: { team: 'młodziczki (2011+)', opponent: 'Sokół Gdańsk', scoreHome: 24, scoreAway: 18, venue: 'dom' } });
    await generate(d.id);
    await finish(d.id, 'Wygrana 24 : 18 z Sokołem Gdańsk. Dziękujemy za doping.');
    const res = await GET(
      new Request(`http://localhost/api/download/${d.id}/plansza?secret=abcdefghijklmnop`),
      { params: Promise.resolve({ id: d.id, what: 'plansza' }) },
    );
    expect(res.status).toBe(200);
    const ev = (await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z')).find((e) => e.type === 'downloaded');
    expect(ev).toMatchObject({ author: 'Ania', postId: d.id, meta: { what: 'plansza' } });
  });

  it('zły sekret → 404 i brak zdarzenia', async () => {
    const res = await GET(new Request('http://localhost/api/download/x/plansza?secret=zly'), { params: Promise.resolve({ id: 'x', what: 'plansza' }) });
    expect(res.status).toBe(404);
    expect(await getEvents().countSince('downloaded', '2000-01-01T00:00:00.000Z')).toBe(0);
  });
});
