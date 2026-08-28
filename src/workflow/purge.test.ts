import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig() }));
import sharp from 'sharp';
import { createDraft, attachPhoto } from './draft';
import { purge } from './purge';
import { getRepo } from '@/db';
import { getStorage } from '@/storage';
beforeEach(() => resetAdapters());
describe('purge', () => {
  it('kasuje pliki; draft znika, gotowy zostaje jako log bez plików', async () => {
    const mk = () => createDraft({ author: 'Ania', type: 'ogloszenie', ip: null, form: { title: 'a', body: 'b' } });
    const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).jpeg().toBuffer();
    const d = await mk(); await attachPhoto(d.id, img); await getRepo().update(d.id, { purgeAfter: '2000-01-01T00:00:00.000Z' });
    const p = await mk();
    const attached = await attachPhoto(p.id, img);
    const photoPath = attached.path;
    await getRepo().update(p.id, { status: 'done', purgeAfter: '2000-01-01T00:00:00.000Z' });
    const fresh = await mk();
    const r = await purge('2001-01-01T00:00:00.000Z');
    expect(r).toEqual({ purged: 1, deletedDrafts: 1 });
    expect(await getRepo().get(d.id)).toBeNull();
    const kept = await getRepo().get(p.id); expect(kept?.purgedAt).not.toBeNull(); expect(kept?.photos).toEqual([]); expect(kept?.creativePath).toBeNull();
    expect(await getStorage().get(photoPath)).toBeNull();
    expect(await getRepo().get(fresh.id)).not.toBeNull();
  });
});
