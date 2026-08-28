import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachLinkSecret: 'abcdefghijklmnop', partnerInfoEnabled: true }) }));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));
import sharp from 'sharp';
import { createDraft, attachPhoto } from '@/workflow/draft';
import { generate } from '@/workflow/generate';
import { finish } from '@/workflow/finish';
import { getRepo } from '@/db';
import { HASHTAGS, PARTNER_FOOTER } from '@/ai/postprocess';
import { loadReady } from './data';
const S = 'abcdefghijklmnop';
beforeEach(() => resetAdapters());
async function ready() {
  const d = await createDraft({ author: 'Ania', type: 'mecz', ip: null, form: { team: 'młodziczki (2011+)', opponent: 'Sokół', scoreHome: 24, scoreAway: 18, venue: 'dom' } });
  const img = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#333' } }).jpeg().toBuffer();
  await attachPhoto(d.id, img); await attachPhoto(d.id, img); await generate(d.id);
  return finish(d.id, 'Wygrana 24 : 18 z Sokołem. Dziękujemy za doping.');
}
describe('loadReady', () => {
  it('gotowy post → tekst finalny, linki do pobrania', async () => {
    const p = await ready();
    const r = await loadReady(S, p.id);
    expect(r.title).toContain('24 : 18');
    expect(r.text).toBe(`${p.caption}\n\n${HASHTAGS}\n\n${PARTNER_FOOTER}`);
    expect(r.creativeUrl).toContain('/api/file/');
    expect(r.downloadCreativeUrl).toBe(`/api/download/${p.id}/plansza?secret=${S}`);
    expect(r.photoDownloads).toEqual([
      { label: 'Zdjęcie 1', url: `/api/download/${p.id}/zdjecie-1?secret=${S}` },
      { label: 'Zdjęcie 2', url: `/api/download/${p.id}/zdjecie-2?secret=${S}` },
    ]);
  });
  it('zły sekret / szkic / wyczyszczony → 404', async () => {
    const p = await ready();
    await expect(loadReady('zly', p.id)).rejects.toMatchObject({ status: 404 });
    const d = await createDraft({ author: 'Ania', type: 'ogloszenie', ip: null, form: { title: 'a', body: 'b' } });
    await expect(loadReady(S, d.id)).rejects.toMatchObject({ status: 404 });
    await getRepo().update(p.id, { purgedAt: '2026-01-01T00:00:00.000Z', photos: [], creativePath: null });
    await expect(loadReady(S, p.id)).rejects.toMatchObject({ status: 404 });
  });
});
