import { describe, it, expect } from 'vitest';
import { monthGrid, dotsByDay, webcalLinks } from './month';
import type { CalEvent } from '@/domain/calendar';
const ev = (team: string | null, startsAt: string, endsAt: string): CalEvent => ({ id: startsAt, type: 'inne', teams: team === null ? [] : [team], title: 't', startsAt, endsAt, allDay: false, place: null, coaches: [], details: {}, seriesId: null, createdBy: 'a', updatedBy: 'a', createdAt: 'x', updatedAt: 'x', deletedAt: null, deletedBy: null });
describe('month', () => {
  it('siatka października 2026: od pon 28.09 do nd 01.11, 35 komórek', () => {
    const g = monthGrid('2026-10');
    expect(g).toHaveLength(35); expect(g[0]).toEqual({ date: '2026-09-28', inMonth: false }); expect(g[34]).toEqual({ date: '2026-11-01', inMonth: false });
  });
  it('kropki: unikalne drużyny per dzień, wielodniowe w każdym dniu', () => {
    const d = dotsByDay([ev('A', '2026-10-09T07:00:00.000Z', '2026-10-10T14:00:00.000Z'), ev('A', '2026-10-09T15:00:00.000Z', '2026-10-09T16:00:00.000Z'), ev(null, '2026-10-09T18:00:00.000Z', '2026-10-09T19:00:00.000Z')], '2026-10');
    expect(d.get('2026-10-09')).toEqual(['A', null]); expect(d.get('2026-10-10')).toEqual(['A']); expect(d.get('2026-10-11')).toBeUndefined();
  });
  it('kropki: wydarzenie kilku drużyn daje kropkę każdej', () => {
    const e = { ...ev('A', '2026-10-09T07:00:00.000Z', '2026-10-09T09:00:00.000Z'), teams: ['A', 'B'] };
    expect(dotsByDay([e], '2026-10').get('2026-10-09')).toEqual(['A', 'B']);
  });
  it('webcal: klub pierwszy, https→webcal, slug drużyny', () => {
    const l = webcalLinks('https://uks-kanal-klubu.vercel.app', 'sek', ['młodziczki (2011+)']);
    expect(l[0]).toEqual({ label: 'Cały klub', slug: 'klub', url: 'webcal://uks-kanal-klubu.vercel.app/api/ics/sek/klub.ics' });
    expect(l[1].url).toBe('webcal://uks-kanal-klubu.vercel.app/api/ics/sek/mlodziczki-2011.ics');
  });
});
