import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryEvents } from './memory';
import { SupabaseEvents } from './supabase';

const ALL: [string, string] = ['2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'];

describe('MemoryEvents', () => {
  let ev: MemoryEvents;
  beforeEach(() => { ev = new MemoryEvents(); });

  it('add uzupełnia domyślne pola, kind = memory', async () => {
    await ev.add({ type: 'hero_set' });
    const [e] = await ev.listRange(...ALL);
    expect(ev.kind).toBe('memory');
    expect(e).toMatchObject({ type: 'hero_set', author: null, postId: null, costUsd: null, meta: {}, content: null });
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(e.at)).not.toBeNaN();
  });

  it('listRange: przedział [from, to), od najnowszego, remisy czasu = najnowszy zapis pierwszy', async () => {
    await ev.add({ type: 'draft_created', at: '2026-09-01T10:00:00.000Z', meta: { k: 1 } });
    await ev.add({ type: 'draft_created', at: '2026-09-01T10:00:00.000Z', meta: { k: 2 } });
    await ev.add({ type: 'draft_created', at: '2026-09-02T10:00:00.000Z', meta: { k: 3 } });
    await ev.add({ type: 'draft_created', at: '2026-10-01T00:00:00.000Z', meta: { k: 4 } });
    const r = await ev.listRange('2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');
    expect(r.map((e) => e.meta.k)).toEqual([3, 2, 1]);
    expect((await ev.listRange(...ALL, 2)).map((e) => e.meta.k)).toEqual([4, 3]);
  });

  it('listByPost: tylko zdarzenia posta, chronologicznie', async () => {
    await ev.add({ type: 'finished', postId: 'p1', at: '2026-09-02T00:00:00.000Z' });
    await ev.add({ type: 'draft_created', postId: 'p1', at: '2026-09-01T00:00:00.000Z' });
    await ev.add({ type: 'draft_created', postId: 'p2', at: '2026-09-01T00:00:00.000Z' });
    expect((await ev.listByPost('p1')).map((e) => e.type)).toEqual(['draft_created', 'finished']);
  });

  it('countSince: typ, próg czasu włącznie i opcjonalne IP z meta', async () => {
    await ev.add({ type: 'admin_login_failed', meta: { ip: '1.1.1.1' }, at: '2026-09-22T10:00:00.000Z' });
    await ev.add({ type: 'admin_login_failed', meta: { ip: '2.2.2.2' }, at: '2026-09-22T10:05:00.000Z' });
    await ev.add({ type: 'admin_login_failed', meta: { ip: '1.1.1.1' }, at: '2026-09-22T09:00:00.000Z' });
    await ev.add({ type: 'admin_login', at: '2026-09-22T10:06:00.000Z' });
    expect(await ev.countSince('admin_login_failed', '2026-09-22T10:00:00.000Z')).toBe(2);
    expect(await ev.countSince('admin_login_failed', '2026-09-22T10:00:00.000Z', '1.1.1.1')).toBe(1);
  });

  it('clearContent / clearContentBefore zerują tylko niepustą treść i zwracają liczbę', async () => {
    await ev.add({ type: 'ai_generated', postId: 'p1', content: { caption: 'a' }, at: '2026-09-01T00:00:00.000Z' });
    await ev.add({ type: 'draft_created', postId: 'p1', at: '2026-09-01T00:00:00.000Z' });
    await ev.add({ type: 'ai_generated', postId: 'p2', content: { caption: 'b' }, at: '2026-09-10T00:00:00.000Z' });
    expect(await ev.clearContent('p1')).toBe(1);
    expect(await ev.clearContent('p1')).toBe(0);
    expect(await ev.clearContentBefore('2026-09-11T00:00:00.000Z')).toBe(1);
    expect((await ev.listRange(...ALL)).every((e) => e.content === null)).toBe(true);
  });

  it('deleteBefore: po typie albo wszystkie', async () => {
    await ev.add({ type: 'admin_login_failed', at: '2026-01-01T00:00:00.000Z' });
    await ev.add({ type: 'draft_created', at: '2026-01-01T00:00:00.000Z' });
    await ev.add({ type: 'draft_created', at: '2026-09-01T00:00:00.000Z' });
    expect(await ev.deleteBefore('admin_login_failed', '2026-06-01T00:00:00.000Z')).toBe(1);
    expect(await ev.deleteBefore(null, '2026-06-01T00:00:00.000Z')).toBe(1);
    expect((await ev.listRange(...ALL)).map((e) => e.at)).toEqual(['2026-09-01T00:00:00.000Z']);
  });

  it('zwraca kopie — mutacja wyniku nie zmienia dziennika', async () => {
    await ev.add({ type: 'finished', postId: 'p1', meta: { changedPct: 10 } });
    const [e] = await ev.listByPost('p1');
    e.meta.changedPct = 99;
    expect((await ev.listByPost('p1'))[0].meta.changedPct).toBe(10);
  });
});

describe('SupabaseEvents — strażnik UUID bez sieci', () => {
  it('nie-UUID: listByPost → [], clearContent → 0, kind = supabase', async () => {
    const ev = new SupabaseEvents('https://example.supabase.co', 'k');
    expect(ev.kind).toBe('supabase');
    expect(await ev.listByPost('nie-uuid')).toEqual([]);
    expect(await ev.clearContent('nie-uuid')).toBe(0);
  });
});
