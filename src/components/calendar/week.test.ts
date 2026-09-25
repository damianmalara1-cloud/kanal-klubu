import { describe, it, expect } from 'vitest';
import { groupByDay, dayLabel, fmtHour, teamHref } from './week';
import type { CalEvent } from '@/domain/calendar';
const ev = (id: string, startsAt: string, endsAt: string): CalEvent => ({ id, type: 'turniej', teams: ['A'], title: 'T', startsAt, endsAt, allDay: false, place: null, coaches: [], details: {}, seriesId: null, createdBy: 'a', updatedBy: 'a', createdAt: 'x', updatedAt: 'x', deletedAt: null, deletedBy: null });
describe('groupByDay', () => {
  it('7 dni od poniedziałku; turniej pt–nd w 3 dniach; trening w 1', () => {
    const days = groupByDay('2026-10-05', [ev('t', '2026-10-09T07:00:00.000Z', '2026-10-11T14:00:00.000Z'), ev('x', '2026-10-06T14:30:00.000Z', '2026-10-06T16:00:00.000Z')]);
    expect(days.map((d) => d.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
    expect(days.map((d) => d.events.map((e) => e.id))).toEqual([[], ['x'], [], [], ['t'], ['t'], ['t']]);
  });
  it('całodniowe kończące się o północy nie wchodzi w dzień następny', () => {
    const days = groupByDay('2026-11-09', [{ ...ev('a', '2026-11-13T23:00:00.000Z', '2026-11-14T23:00:00.000Z'), allDay: true }]);
    expect(days.map((d) => d.events.length)).toEqual([0, 0, 0, 0, 0, 1, 0]);
  });
  it('etykiety', () => { expect(dayLabel('2026-09-28')).toBe('pon 28.09'); expect(fmtHour('2026-09-29T14:30:00.000Z')).toBe('16:30'); });
});
describe('teamHref', () => {
  it('"Wszystkie" (t vide) → team= obecny, ale pusty', () => {
    expect(teamHref('S', '2026-09-28', '')).toBe('/t/S/kalendarz?d=2026-09-28&team=');
  });
  it('"cały klub"', () => {
    expect(teamHref('S', '2026-09-28', 'klub')).toBe('/t/S/kalendarz?d=2026-09-28&team=klub');
  });
  it('nazwa drużyny kodowana', () => {
    expect(teamHref('S', '2026-09-28', 'drużyna A')).toBe(`/t/S/kalendarz?d=2026-09-28&team=${encodeURIComponent('drużyna A')}`);
  });
});
