import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
const cfg = vi.hoisted(() => ({ mockExternal: true, cronSecret: 'cron' }));
vi.mock('@/config', () => ({ getConfig: () => testConfig({ mockExternal: cfg.mockExternal, coachLinkSecret: 'abcdefghijklmnop', cronSecret: cfg.cronSecret }) }));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from([0x89, 0x50, 0x4e, 0x47])) }));
import sharp from 'sharp';
import { createDraft, attachPhoto } from '@/workflow/draft';
import { generate } from '@/workflow/generate';
import { finish } from '@/workflow/finish';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { purge } from '@/workflow/purge';
import { log } from '@/lib/log';
import { GET as fileGet } from './file/[...path]/route';
import { GET as downloadGet } from './download/[id]/[what]/route';
import { GET as cronGet } from './cron/purge/route';

const S = 'abcdefghijklmnop';
beforeEach(() => { resetAdapters(); cfg.mockExternal = true; cfg.cronSecret = 'cron'; });
afterEach(() => vi.restoreAllMocks());
async function readyPost() {
  const d = await createDraft({ author: 'Ania', type: 'mecz', ip: null, form: { team: 'młodziczki (2011+)', opponent: 'Sokół', scoreHome: 24, scoreAway: 18, venue: 'dom' } });
  const img = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#333' } }).jpeg().toBuffer();
  await attachPhoto(d.id, img); await generate(d.id);
  return finish(d.id, 'Wygrana 24 : 18 z Sokołem. Dziękujemy za doping.');
}

describe('download', () => {
  it('plansza i zdjęcie jako attachment; zły sekret 404; nieznane what 404', async () => {
    const p = await readyPost();
    const r = await downloadGet(new Request(`http://x/api/download/${p.id}/plansza?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'plansza' }) });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/png');
    expect(r.headers.get('content-disposition')).toMatch(/^attachment; filename="uks-banino-mecz-\d{4}-\d{2}-\d{2}-plansza\.png"$/);
    expect(r.headers.get('cache-control')).toBe('private, no-store');
    const z = await downloadGet(new Request(`http://x/api/download/${p.id}/zdjecie-1?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'zdjecie-1' }) });
    expect(z.status).toBe(200); expect(z.headers.get('content-type')).toBe('image/jpeg');
    // Nazwa musi rozróżniać planszę od zdjęć i zdjęcia między sobą — inaczej w folderze Pobrane
    // wszystko z jednego posta ma tę samą nazwę i zapisuje się jako (1), (2)…
    expect(z.headers.get('content-disposition')).toMatch(/^attachment; filename="uks-banino-mecz-\d{4}-\d{2}-\d{2}-zdjecie-1\.jpg"$/);
    expect((await downloadGet(new Request(`http://x/api/download/${p.id}/plansza?secret=zly`), { params: Promise.resolve({ id: p.id, what: 'plansza' }) })).status).toBe(404);
    expect((await downloadGet(new Request(`http://x/api/download/${p.id}/zdjecie-9?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'zdjecie-9' }) })).status).toBe(404);
    expect((await downloadGet(new Request(`http://x/api/download/${p.id}/cokolwiek?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'cokolwiek' }) })).status).toBe(404);
  });
  it('data w nazwie pliku jest datą polską, nie UTC', async () => {
    // 14.03 o 23:30 UTC to w Polsce już 15.03 (CET, zimą +1). Trener widzi w telefonie 15 marca i tak
    // szuka pliku — nazwa musi się z tym zgadzać.
    const p = await readyPost();
    await getRepo().update(p.id, { createdAt: '2026-03-14T23:30:00.000Z' });
    const r = await downloadGet(new Request(`http://x/api/download/${p.id}/plansza?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'plansza' }) });
    expect(r.headers.get('content-disposition')).toContain('2026-03-15');
  });
  it('szkic (niegotowy) → 404', async () => {
    const d = await createDraft({ author: 'Ania', type: 'ogloszenie', ip: null, form: { title: 'a', body: 'b' } });
    expect((await downloadGet(new Request(`http://x/api/download/${d.id}/plansza?secret=${S}`), { params: Promise.resolve({ id: d.id, what: 'plansza' }) })).status).toBe(404);
  });
  it('nieznany id → 404', async () => {
    const r = await downloadGet(new Request(`http://x/api/download/nieistniejacy-id/plansza?secret=${S}`), { params: Promise.resolve({ id: 'nieistniejacy-id', what: 'plansza' }) });
    expect(r.status).toBe(404);
  });
  it('gotowy post po purge (retencja minęła) → 404 dla planszy i zdjęcia — jawny purgedAt, nie tylko puste ścieżki', async () => {
    const p = await readyPost();
    await purge('2100-01-01T00:00:00.000Z');
    expect((await downloadGet(new Request(`http://x/api/download/${p.id}/plansza?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'plansza' }) })).status).toBe(404);
    expect((await downloadGet(new Request(`http://x/api/download/${p.id}/zdjecie-1?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'zdjecie-1' }) })).status).toBe(404);
  });
  it('plik brakuje w storage mimo gotowego posta (niespójny stan) → 404', async () => {
    const p = await readyPost();
    await getStorage().remove([p.creativePath!]);
    const r = await downloadGet(new Request(`http://x/api/download/${p.id}/plansza?secret=${S}`), { params: Promise.resolve({ id: p.id, what: 'plansza' }) });
    expect(r.status).toBe(404);
  });
});

describe('file (mock)', () => {
  it('serwuje plik z pamięci tylko z kluczem', async () => {
    const p = await readyPost();
    const { getMemoryStorage } = await import('@/storage');
    const mem = getMemoryStorage()!;
    const ok = await fileGet(new Request(`http://x/api/file/${p.creativePath}?k=${mem.key}`), { params: Promise.resolve({ path: p.creativePath!.split('/') }) });
    expect(ok.status).toBe(200); expect(ok.headers.get('content-type')).toBe('image/png');
    expect((await fileGet(new Request(`http://x/api/file/${p.creativePath}?k=zly`), { params: Promise.resolve({ path: p.creativePath!.split('/') }) })).status).toBe(404);
  });
});

describe('cron', () => {
  it('poza mockiem bez Bearer 401 (zalogowany); z Bearer 200 + wynik (zalogowany)', async () => {
    // Cichy 401 z crona wygląda w logu Vercela identycznie jak brak wywołania — operator nie ma
    // jak odróżnić „cron nie przyszedł" od „cron przyszedł ze złym sekretem". Wartość sekretu
    // nigdy nie trafia do logu, tylko flaga, czy w ogóle jest ustawiony.
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    const infoSpy = vi.spyOn(log, 'info').mockImplementation(() => {});
    cfg.mockExternal = false;
    cfg.cronSecret = 'tajny-sekret-crona';
    expect((await cronGet(new Request('http://x/api/cron/purge'))).status).toBe(401);
    expect(errSpy).toHaveBeenCalledWith('cron: unauthorized', { hasSecret: true });
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('tajny-sekret-crona');
    cfg.mockExternal = true;
    const d = await createDraft({ author: 'Ania', type: 'ogloszenie', ip: null, form: { title: 'a', body: 'b' } });
    await getRepo().update(d.id, { purgeAfter: '2000-01-01T00:00:00.000Z' });
    const r = await cronGet(new Request('http://x/api/cron/purge', { headers: { authorization: 'Bearer tajny-sekret-crona' } }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ purged: 0, deletedDrafts: 1, failed: 0 });
    expect(infoSpy).toHaveBeenCalledWith('purge', { purged: 0, deletedDrafts: 1, failed: 0 });
  });
  it('poza mockiem zły Bearer → 401', async () => {
    vi.spyOn(log, 'error').mockImplementation(() => {});
    cfg.mockExternal = false;
    const r = await cronGet(new Request('http://x/api/cron/purge', { headers: { authorization: 'Bearer zly' } }));
    expect(r.status).toBe(401);
  });
  it('poza mockiem pusty CRON_SECRET → 401 nawet z Bearerem, log z hasSecret: false', async () => {
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    cfg.mockExternal = false;
    cfg.cronSecret = '';
    const r = await cronGet(new Request('http://x/api/cron/purge', { headers: { authorization: 'Bearer cokolwiek' } }));
    expect(r.status).toBe(401);
    expect(errSpy).toHaveBeenCalledWith('cron: unauthorized', { hasSecret: false });
  });
  it('w trybie mock brak nagłówka Authorization nadal 200 (bypass izolowany od gałęzi Bearer)', async () => {
    vi.spyOn(log, 'info').mockImplementation(() => {}); // realny log.info z udanego purge — tłumimy, żeby output testów był czysty
    cfg.mockExternal = true;
    const r = await cronGet(new Request('http://x/api/cron/purge'));
    expect(r.status).toBe(200);
  });
});
