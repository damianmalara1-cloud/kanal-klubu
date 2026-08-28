import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRepo } from './memory';
import type { NewPost } from './types';

const np = (over: Partial<NewPost> = {}): NewPost => ({
  author: 'Ania', type: 'mecz', ip: '1.1.1.1', partnerInfo: true, reviewToken: 'tok', purgeAfter: '2030-01-01T00:00:00.000Z',
  form: { team: 'młodziczki (2011+)', opponent: 'X', scoreHome: 1, scoreAway: 2, venue: 'dom', venueCity: null, notes: null }, ...over,
});

describe('MemoryRepo', () => {
  let repo: MemoryRepo;
  beforeEach(() => { repo = new MemoryRepo(); });

  it('create/get/update/delete', async () => {
    const p = await repo.create(np());
    expect(p.status).toBe('draft'); expect(p.regenCount).toBe(0);
    expect((await repo.get(p.id))?.author).toBe('Ania');
    const u = await repo.update(p.id, { status: 'pending', caption: 'x' });
    expect(u.status).toBe('pending'); expect(u.updatedAt >= p.updatedAt).toBe(true);
    await repo.delete(p.id);
    expect(await repo.get(p.id)).toBeNull();
  });
  it('listByAuthor sortuje malejąco i limituje', async () => {
    const p1 = await repo.create(np()); await repo.update(p1.id, { status: 'pending', createdAt: '2026-01-01T00:00:00.000Z' });
    const p2 = await repo.create(np()); await repo.update(p2.id, { status: 'published', createdAt: '2026-01-02T00:00:00.000Z' });
    await repo.create(np({ author: 'K' }));
    const l = await repo.listByAuthor('Ania', 1);
    expect(l).toHaveLength(1);
    expect(l[0].id).toBe(p2.id);
  });
  it('listByAuthor sortuje stabilnie po id gdy createdAt identyczny (remis)', async () => {
    // 5 postów o tym samym createdAt — przy niestabilnym sortowaniu (tylko po createdAt)
    // kolejność wynikałaby z insertion order, co praktycznie nigdy nie zgadza się
    // z pełnym sortowaniem malejąco po id (1 na 5! = 120 permutacji)
    const tie = '2026-01-01T00:00:00.000Z';
    const posts: Awaited<ReturnType<typeof repo.create>>[] = [];
    for (let i = 0; i < 5; i++) {
      const p = await repo.create(np());
      await repo.update(p.id, { status: 'pending', createdAt: tie });
      posts.push(p);
    }
    const expectedOrder = posts.map((p) => p.id).sort((a, b) => b.localeCompare(a));
    const l = await repo.listByAuthor('Ania', 10);
    expect(l.map((x) => x.id)).toEqual(expectedOrder);
  });
  it('listByAuthor pomija posty w statusie draft', async () => {
    const draft = await repo.create(np());
    const a = await repo.create(np());
    await repo.update(a.id, { status: 'pending' });
    const b = await repo.create(np());
    await repo.update(b.id, { status: 'published' });
    const l = await repo.listByAuthor('Ania', 10);
    expect(l.map((x) => x.id)).not.toContain(draft.id);
    expect(l.map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    const limited = await repo.listByAuthor('Ania', 1);
    expect(limited).toHaveLength(1);
  });
  it('liczniki rate limitu', async () => {
    await repo.create(np()); await repo.create(np({ ip: '2.2.2.2' }));
    expect(await repo.countCreatedSince('1.1.1.1', '2000-01-01T00:00:00.000Z')).toBe(1);
    const p = await repo.create(np()); await repo.update(p.id, { regenCount: 2 });
    expect(await repo.sumGenerationsSince('2000-01-01T00:00:00.000Z')).toBe(1 + 1 + 3);
  });
  it('listForPurge i listPendingUnnotified', async () => {
    const a = await repo.create(np({ purgeAfter: '2000-01-01T00:00:00.000Z' }));
    await repo.update(a.id, { status: 'published' });
    const b = await repo.create(np());
    await repo.update(b.id, { status: 'pending', tgMessageId: null, updatedAt: '2000-01-01T00:00:00.000Z' });
    expect((await repo.listForPurge('2001-01-01T00:00:00.000Z')).map((x) => x.id)).toEqual([a.id]);
    expect((await repo.listPendingUnnotified('2000-06-01T00:00:00.000Z')).map((x) => x.id)).toEqual([b.id]);
  });
  it('listForPurge zwraca post gdy purgeAfter jest dokładnie równe now (granica <=)', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const a = await repo.create(np({ purgeAfter: now }));
    await repo.update(a.id, { status: 'published' });
    const result = await repo.listForPurge(now);
    expect(result.map((x) => x.id)).toContain(a.id);
  });
  it('get zwraca kopię — mutacja zwróconego obiektu nie wpływa na store', async () => {
    const p = await repo.create(np());
    const got = await repo.get(p.id);
    if (got) got.caption = 'zmienione-tylko-lokalnie';
    const again = await repo.get(p.id);
    expect(again?.caption).not.toBe('zmienione-tylko-lokalnie');
  });
});
