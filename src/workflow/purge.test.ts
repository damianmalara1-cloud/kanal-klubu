import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig() }));
import sharp from 'sharp';
import { createDraft, attachPhoto } from './draft';
import { purge } from './purge';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { getEvents } from '@/events';
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
    expect(r).toEqual({ purged: 1, deletedDrafts: 1, failed: 0, eventsContentCleared: 0, eventsDeleted: 0 });
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

    expect(r).toEqual({ purged: 1, deletedDrafts: 0, failed: 1, eventsContentCleared: 0, eventsDeleted: 0 });
    expect(errSpy).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalledWith('purge', expect.objectContaining({ id: d.id }));
    // post, na którym padło, zostaje nietknięty — spróbujemy znów następnego dnia
    expect(await getRepo().get(d.id)).not.toBeNull();
    const kept = await getRepo().get(p.id);
    expect(kept?.purgedAt).not.toBeNull();
  });
});

const ALL: [string, string] = ['2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'];

describe('purge — retencja dziennika', () => {
  it('treść zdarzeń znika razem z postem, metadane i koszt zostają', async () => {
    const d = await createDraft({ author: 'Ania', type: 'ogloszenie', ip: null, form: { title: 'a', body: 'b' } });
    await getEvents().add({ type: 'ai_generated', author: 'Ania', postId: d.id, costUsd: 0.002, meta: { regen: false }, content: { caption: 'Imię Nazwisko' } });
    await getRepo().update(d.id, { purgeAfter: '2000-01-01T00:00:00.000Z' });
    const r = await purge('2001-01-01T00:00:00.000Z');
    expect(r).toMatchObject({ deletedDrafts: 1, eventsContentCleared: 1, failed: 0 });
    const gen = (await getEvents().listByPost(d.id)).find((e) => e.type === 'ai_generated');
    expect(gen).toMatchObject({ costUsd: 0.002, meta: { regen: false }, content: null });
  });

  it('siatka 8 dni, nieudane logowania po 1 dniu, wszystko po 365 dniach', async () => {
    const ev = getEvents();
    await ev.add({ type: 'ai_generated', content: { note: 'x' }, at: '2026-09-13T12:00:00.000Z' }); // 9 dni → treść znika
    await ev.add({ type: 'ai_generated', content: { note: 'y' }, at: '2026-09-20T12:00:00.000Z' }); // 2 dni → zostaje
    await ev.add({ type: 'admin_login_failed', meta: { ip: '1.2.3.4' }, at: '2026-09-21T11:00:00.000Z' }); // > 1 dzień → kasowane
    await ev.add({ type: 'admin_login_failed', meta: { ip: '1.2.3.4' }, at: '2026-09-22T11:00:00.000Z' }); // zostaje
    await ev.add({ type: 'draft_created', at: '2025-09-01T00:00:00.000Z' }); // > 365 dni → kasowane
    const r = await purge('2026-09-22T12:00:00.000Z');
    expect(r).toMatchObject({ eventsContentCleared: 1, eventsDeleted: 2, failed: 0 });
    const left = await ev.listRange(...ALL);
    expect(left).toHaveLength(3);
    expect(left.find((e) => e.at === '2026-09-13T12:00:00.000Z')?.content).toBeNull();
    expect(left.find((e) => e.at === '2026-09-20T12:00:00.000Z')?.content).toEqual({ note: 'y' });
  });

  it('błąd sprzątania dziennika nie blokuje postów — failed++, log purge-events', async () => {
    const d = await createDraft({ author: 'Ania', type: 'ogloszenie', ip: null, form: { title: 'a', body: 'b' } });
    await getRepo().update(d.id, { purgeAfter: '2000-01-01T00:00:00.000Z' });
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.spyOn(getEvents(), 'clearContentBefore').mockRejectedValueOnce(new Error('boom'));
    const r = await purge('2001-01-01T00:00:00.000Z');
    expect(r).toMatchObject({ deletedDrafts: 1, failed: 1 });
    expect(errSpy).toHaveBeenCalledWith('purge-events', expect.objectContaining({ err: 'boom' }));
  });
});
