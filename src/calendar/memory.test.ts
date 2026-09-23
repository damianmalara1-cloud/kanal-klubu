import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCalendar } from './memory';
import type { NewCalEvent } from './types';

const row = (startsAt: string, endsAt: string, extra: Partial<NewCalEvent> = {}): NewCalEvent => ({
  type: 'trening', team: 'A', title: 'Trening · Ania', startsAt, endsAt, allDay: false, place: null, coaches: ['Ania'], details: {}, seriesId: null, by: 'Ania', ...extra,
});
let repo: MemoryCalendar;
beforeEach(() => { repo = new MemoryCalendar(); });

describe('MemoryCalendar', () => {
  it('create/get: autorzy i daty systemowe; nieznane id → null', async () => {
    const e = await repo.create(row('2026-10-01T14:30:00.000Z', '2026-10-01T16:00:00.000Z'));
    expect(e).toMatchObject({ createdBy: 'Ania', updatedBy: 'Ania', deletedAt: null, seriesId: null });
    expect(await repo.get(e.id)).toEqual(e);
    expect(await repo.get('nie-ma')).toBeNull();
  });
  it('listRange: nakładające się, rosnąco, filtr drużyny (undefined=wszystkie, null=cały klub), bez kosza', async () => {
    const a = await repo.create(row('2026-10-01T14:00:00.000Z', '2026-10-01T15:00:00.000Z'));
    const b = await repo.create(row('2026-09-30T22:00:00.000Z', '2026-10-01T00:30:00.000Z', { team: 'B' }));
    const c = await repo.create(row('2026-10-05T10:00:00.000Z', '2026-10-05T11:00:00.000Z', { team: null }));
    await repo.create(row('2026-09-01T10:00:00.000Z', '2026-09-01T11:00:00.000Z'));
    const all = await repo.listRange('2026-10-01T00:00:00.000Z', '2026-10-08T00:00:00.000Z');
    expect(all.map((e) => e.id)).toEqual([b.id, a.id, c.id]);
    expect((await repo.listRange('2026-10-01T00:00:00.000Z', '2026-10-08T00:00:00.000Z', 'A')).map((e) => e.id)).toEqual([a.id]);
    expect((await repo.listRange('2026-10-01T00:00:00.000Z', '2026-10-08T00:00:00.000Z', null)).map((e) => e.id)).toEqual([c.id]);
    await repo.softDelete([a.id], 'Krzysiek', '2026-10-02T00:00:00.000Z');
    expect((await repo.listRange('2026-10-01T00:00:00.000Z', '2026-10-08T00:00:00.000Z')).map((e) => e.id)).toEqual([b.id, c.id]);
  });
  it('createMany + listSeriesFrom + updateMany', async () => {
    const s = 'series-1';
    const rows = ['2026-10-01', '2026-10-06', '2026-10-08'].map((d) => row(`${d}T14:30:00.000Z`, `${d}T16:00:00.000Z`, { seriesId: s }));
    const made = await repo.createMany(rows);
    expect(made).toHaveLength(3);
    const from = await repo.listSeriesFrom(s, '2026-10-06T00:00:00.000Z');
    expect(from.map((e) => e.startsAt)).toEqual(['2026-10-06T14:30:00.000Z', '2026-10-08T14:30:00.000Z']);
    expect(await repo.updateMany(from.map((e) => e.id), { place: 'Hala B' }, 'Krzysiek')).toBe(2);
    expect((await repo.get(made[0].id))?.place).toBeNull();
    expect((await repo.get(made[1].id))).toMatchObject({ place: 'Hala B', updatedBy: 'Krzysiek' });
  });
  it('softDelete idempotentne, restore, listDeleted, purgeDeletedBefore', async () => {
    const a = await repo.create(row('2026-10-01T14:00:00.000Z', '2026-10-01T15:00:00.000Z'));
    const b = await repo.create(row('2026-10-02T14:00:00.000Z', '2026-10-02T15:00:00.000Z'));
    expect(await repo.softDelete([a.id, b.id], 'Ania', '2026-10-10T00:00:00.000Z')).toBe(2);
    expect(await repo.softDelete([a.id], 'Ania', '2026-10-11T00:00:00.000Z')).toBe(0);
    expect((await repo.listDeleted()).map((e) => e.id)).toEqual([a.id, b.id]);
    expect(await repo.restore([b.id], 'admin')).toBe(1);
    expect((await repo.get(b.id))).toMatchObject({ deletedAt: null, deletedBy: null, updatedBy: 'admin' });
    expect(await repo.purgeDeletedBefore('2026-10-10T00:00:00.001Z')).toBe(1);
    expect(await repo.get(a.id)).toBeNull();
  });
});
