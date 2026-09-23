import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachNames: ['Ania', 'Krzysiek'], teams: ['A', 'B'] }) }));
import { createEvent, createSeries, updateEvent, deleteEvent, restoreEvents, restoreSeries, listWeek, getEvent, diffFields } from './calendar';
import { getCalendar } from '@/calendar';
import { getEvents } from '@/events';

const T = { type: 'trening', team: 'A', date: '2026-09-29', startTime: '16:30', endTime: '18:00', place: 'Hala', coaches: ['Ania'] };
const evTypes = async () => (await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z')).map((e) => e.type).reverse();
beforeEach(() => resetAdapters());

describe('createEvent / createSeries', () => {
  it('pojedynczy: zapis + cal_created z meta', async () => {
    const e = await createEvent(T, 'Ania');
    expect(e).toMatchObject({ team: 'A', title: 'Trening · Ania', createdBy: 'Ania', seriesId: null });
    const [ev] = await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z');
    expect(ev).toMatchObject({ type: 'cal_created', author: 'Ania', meta: { eventId: e.id, type: 'trening', team: 'A', startsAt: e.startsAt } });
  });
  it('seria wt+czw do 15.10 → 5 wierszy z jednym seriesId, jedno zdarzenie cal_series_created(count)', async () => {
    const r = await createSeries({ ...T, date: '2026-09-30' }, { weekdays: [2, 4], until: '2026-10-15' }, 'Ania');
    expect(r.count).toBe(5);
    const rows = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    expect(rows.map((x) => x.startsAt)).toEqual(['2026-10-01T14:30:00.000Z', '2026-10-06T14:30:00.000Z', '2026-10-08T14:30:00.000Z', '2026-10-13T14:30:00.000Z', '2026-10-15T14:30:00.000Z']);
    expect(await evTypes()).toEqual(['cal_series_created']);
  });
  it('seria przez zmianę czasu 25.10: godzina lokalna stała', async () => {
    const r = await createSeries({ ...T, date: '2026-10-20' }, { weekdays: [2], until: '2026-10-27' }, 'Ania');
    const rows = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    expect(rows.map((x) => x.startsAt)).toEqual(['2026-10-20T14:30:00.000Z', '2026-10-27T15:30:00.000Z']);
  });
});

describe('updateEvent', () => {
  it('scope one: zmiana godziny zostaje w serii; zmiana daty odłącza; cal_updated ma tylko zmienione pola', async () => {
    const r = await createSeries({ ...T, date: '2026-09-29' }, { weekdays: [2], until: '2026-10-13' }, 'Ania');
    const [a, b] = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    const u = await updateEvent(b.id, { ...T, date: '2026-10-06', startTime: '17:00' }, 'Krzysiek', 'one');
    expect(u.event).toMatchObject({ startsAt: '2026-10-06T15:00:00.000Z', seriesId: r.seriesId, updatedBy: 'Krzysiek' });
    const ev = (await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'))[0];
    expect(ev.type).toBe('cal_updated');
    expect(Object.keys(ev.meta.changes as object)).toEqual(['startsAt']);
    const moved = await updateEvent(a.id, { ...T, date: '2026-09-30' }, 'Ania', 'one');
    expect(moved.event.seriesId).toBeNull();
  });
  it('scope following: zmienia godzinę/miejsce od tego terminu, zachowując daty; wcześniejsze nietknięte', async () => {
    const r = await createSeries({ ...T, date: '2026-09-29' }, { weekdays: [2], until: '2026-10-20' }, 'Ania');
    const rows = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    const u = await updateEvent(rows[1].id, { ...T, date: '2026-10-06', startTime: '17:00', endTime: '18:30', place: 'Hala B' }, 'Ania', 'following');
    expect(u.count).toBe(3);
    const after = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    expect(after.map((x) => [x.startsAt, x.place])).toEqual([
      ['2026-09-29T14:30:00.000Z', 'Hala'], ['2026-10-06T15:00:00.000Z', 'Hala B'], ['2026-10-13T15:00:00.000Z', 'Hala B'], ['2026-10-20T15:00:00.000Z', 'Hala B'],
    ]);
    expect(await evTypes()).toEqual(['cal_series_created', 'cal_series_updated']);
  });
  it('following na wydarzeniu bez serii = one', async () => {
    const e = await createEvent(T, 'Ania');
    const u = await updateEvent(e.id, { ...T, place: 'X' }, 'Ania', 'following');
    expect(u.count).toBe(1);
    expect((await evTypes()).at(-1)).toBe('cal_updated');
  });
  it('scope following: changes liczone wg WŁASNEJ daty wiersza, nie daty z formularza', async () => {
    const r = await createSeries({ ...T, date: '2026-09-29' }, { weekdays: [2], until: '2026-10-20' }, 'Ania');
    const rows = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    // Data w formularzu jest celowo błędna (grudzień) — wiersze mają zostać na swoich datach, a `changes`
    // ma pokazywać godzinę przeliczoną na datę WIERSZA (06.10), nie datę z formularza.
    const u = await updateEvent(rows[1].id, { ...T, date: '2026-12-24', startTime: '17:00' }, 'Ania', 'following');
    expect(u.event.startsAt).toBe('2026-10-06T15:00:00.000Z');
    const ev = (await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'))[0];
    expect(ev.type).toBe('cal_series_updated');
    expect((ev.meta.changes as Record<string, { from: unknown; to: unknown }>).startsAt.to).toBe('2026-10-06T15:00:00.000Z');
  });
  it('scope following: awaria w trakcie serii zapisuje częściowy postęp (partial) i przerywa', async () => {
    const r = await createSeries({ ...T, date: '2026-09-29' }, { weekdays: [2], until: '2026-10-20' }, 'Ania');
    const rows = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    const repo = getCalendar();
    const orig = repo.update.bind(repo);
    let n = 0;
    vi.spyOn(repo, 'update').mockImplementation(async (...args: Parameters<typeof repo.update>) => {
      n++;
      if (n === 2) throw new Error('db');
      return orig(...args);
    });
    await expect(updateEvent(rows[0].id, { ...T, place: 'Hala C' }, 'Ania', 'following')).rejects.toThrow('db');
    const ev = (await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'))[0];
    expect(ev).toMatchObject({ type: 'cal_series_updated', meta: { count: 1, partial: true } });
  });
});

describe('deleteEvent / restore', () => {
  it('one → kosz jednego; following → wszystkie od tego; restoreSeries wraca całość; dziennik', async () => {
    const r = await createSeries({ ...T, date: '2026-09-29' }, { weekdays: [2], until: '2026-10-20' }, 'Ania');
    const rows = await getCalendar().listSeriesFrom(r.seriesId, '2000-01-01T00:00:00.000Z');
    expect((await deleteEvent(rows[0].id, 'Ania', 'one')).ids).toEqual([rows[0].id]);
    const d = await deleteEvent(rows[2].id, 'Krzysiek', 'following');
    expect(d.ids).toEqual([rows[2].id, rows[3].id]);
    expect((await listWeek('2026-10-12')).map((x) => x.id)).toEqual([]);
    expect((await listWeek('2026-10-05')).map((x) => x.id)).toEqual([rows[1].id]);
    expect(await restoreEvents([rows[0].id], 'Ania')).toBe(1);
    expect(await restoreSeries(r.seriesId, 'admin')).toBe(2);
    expect(await evTypes()).toEqual(['cal_series_created', 'cal_deleted', 'cal_series_deleted', 'cal_restored', 'cal_restored']);
    await expect(getEvent('nie-ma')).rejects.toThrow(/Nie ma takiego/);
  });
});

describe('diffFields', () => {
  it('porównuje płytko, tablice i obiekty przez JSON', () => {
    const before = { type: 'trening', team: 'A', title: 't', startsAt: 's', endsAt: 'e', allDay: false, place: null, coaches: ['Ania'], details: {} } as never;
    expect(diffFields(before, { type: 'trening', team: 'A', title: 't', startsAt: 's', endsAt: 'e', allDay: false, place: 'H', coaches: ['Ania'], details: {} })).toEqual({ place: { from: null, to: 'H' } });
  });
  it('details z inną kolejnością kluczy (jsonb z Postgresa) nie tworzy fałszywej zmiany', () => {
    const before = { type: 'mecz', team: 'A', title: 't', startsAt: 's', endsAt: 'e', allDay: false, place: null, coaches: [], details: { opponent: 'X', venue: 'dom' } } as never;
    expect(diffFields(before, { type: 'mecz', team: 'A', title: 't', startsAt: 's', endsAt: 'e', allDay: false, place: null, coaches: [], details: { venue: 'dom', opponent: 'X' } })).toEqual({});
  });
  it('coaches w innej kolejności nie tworzy fałszywej zmiany', () => {
    const before = { type: 'trening', team: 'A', title: 't', startsAt: 's', endsAt: 'e', allDay: false, place: null, coaches: ['Ania', 'Krzysiek'], details: {} } as never;
    expect(diffFields(before, { type: 'trening', team: 'A', title: 't', startsAt: 's', endsAt: 'e', allDay: false, place: null, coaches: ['Krzysiek', 'Ania'], details: {} })).toEqual({});
  });
});
