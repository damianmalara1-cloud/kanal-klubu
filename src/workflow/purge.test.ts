import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig() }));
import sharp from 'sharp';
import { createDraft, attachPhoto } from './draft';
import { purge } from './purge';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { log } from '@/lib/log';
beforeEach(() => resetAdapters());
afterEach(() => vi.restoreAllMocks());
describe('purge', () => {
  it('kasuje pliki; draft znika, gotowy zostaje jako log bez plików i bez IP', async () => {
    const mk = () => createDraft({ author: 'Ania', type: 'ogloszenie', ip: '77.65.43.21', form: { title: 'a', body: 'b' } });
    const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).jpeg().toBuffer();
    const d = await mk(); await attachPhoto(d.id, img); await getRepo().update(d.id, { purgeAfter: '2000-01-01T00:00:00.000Z' });
    const p = await mk();
    const attached = await attachPhoto(p.id, img);
    const photoPath = attached.path;
    await getRepo().update(p.id, { status: 'done', purgeAfter: '2000-01-01T00:00:00.000Z' });
    const fresh = await mk();
    const r = await purge('2001-01-01T00:00:00.000Z');
    expect(r).toEqual({ purged: 1, deletedDrafts: 1, failed: 0 });
    expect(await getRepo().get(d.id)).toBeNull();
    const kept = await getRepo().get(p.id); expect(kept?.purgedAt).not.toBeNull(); expect(kept?.photos).toEqual([]); expect(kept?.creativePath).toBeNull();
    // IP było potrzebne tylko do rate limitu 20 postów/h — po retencji zostaje log posta, nie dana osobowa
    expect(kept?.ip).toBeNull();
    expect(await getStorage().get(photoPath)).toBeNull();
    expect(await getRepo().get(fresh.id)).not.toBeNull();
  });

  it('błąd na jednym poście nie blokuje kolejki — logowany, liczony jako failed, reszta idzie dalej', async () => {
    const mk = () => createDraft({ author: 'Ania', type: 'ogloszenie', ip: null, form: { title: 'a', body: 'b' } });
    const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).jpeg().toBuffer();
    // d powstaje jako pierwszy → listForPurge zwraca go pierwszego → jego storage.remove padnie
    const d = await mk(); await attachPhoto(d.id, img); await getRepo().update(d.id, { purgeAfter: '2000-01-01T00:00:00.000Z' });
    const p = await mk(); await attachPhoto(p.id, img); await getRepo().update(p.id, { status: 'done', purgeAfter: '2000-01-01T00:00:00.000Z' });
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.spyOn(getStorage(), 'remove').mockRejectedValueOnce(new Error('boom'));

    const r = await purge('2001-01-01T00:00:00.000Z');

    expect(r).toEqual({ purged: 1, deletedDrafts: 0, failed: 1 });
    expect(errSpy).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalledWith('purge', expect.objectContaining({ id: d.id }));
    // post, na którym padło, zostaje nietknięty — spróbujemy znów następnego dnia
    expect(await getRepo().get(d.id)).not.toBeNull();
    const kept = await getRepo().get(p.id);
    expect(kept?.purgedAt).not.toBeNull();
  });
});
