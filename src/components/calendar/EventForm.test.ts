import { describe, it, expect } from 'vitest';
import type { CalEvent } from '@/domain/calendar';
import { emptyForm, fromEvent, toRaw } from './form';
describe('EventForm — mapowanie', () => {
  it('trening domyślne godziny, dzień tygodnia z daty, until = koniec sezonu', () => {
    expect(emptyForm('trening', '2026-09-30', '2027-06-30')).toMatchObject({ startTime: '16:30', endTime: '18:00', weekdays: [3], until: '2027-06-30' });
  });
  it('toRaw: mecz dom bez matchTime; całodniowe bez godzin; inne z tytułem', () => {
    const m = emptyForm('mecz', '2026-10-10', '2027-06-30');
    expect(toRaw({ ...m, opponent: 'X', matchTime: '11:00' })).toMatchObject({ opponent: 'X', venue: 'dom', matchTime: null });
    expect(toRaw({ ...emptyForm('turniej', '2026-10-10', '2027-06-30'), allDay: true, startTime: '10:00', name: 'T' })).toMatchObject({ allDay: true, startTime: null, endTime: null, name: 'T' });
    expect(toRaw({ ...emptyForm('inne', '2026-10-10', '2027-06-30'), title: 'Zebranie' })).toMatchObject({ title: 'Zebranie' });
  });
  it('fromEvent: godziny lokalne, całodniowe endDate = dzień przed ends_at, details rozłożone', () => {
    // Adnotacja typu `CalEvent` zamiast `as const` z brief-u — `as const` na całym obiekcie robi z `coaches`
    // readonly krotkę, niezgodną z `string[]` w `CalEvent`; jawny typ daje tę samą literałową kontekstową
    // typizację `type`/`venue` bez tego efektu ubocznego.
    const e: CalEvent = { id: 'x', type: 'mecz', team: 'A', title: 'vs X', startsAt: '2026-10-10T06:00:00.000Z', endsAt: '2026-10-10T13:00:00.000Z', allDay: false, place: 'Kwidzyn', coaches: ['Ania'], details: { opponent: 'X', venue: 'wyjazd', matchTime: '11:00', notes: 'n' }, seriesId: null, createdBy: 'a', updatedBy: 'a', createdAt: 'c', updatedAt: 'u', deletedAt: null, deletedBy: null };
    expect(fromEvent(e, '2027-06-30')).toMatchObject({ date: '2026-10-10', startTime: '08:00', endTime: '15:00', opponent: 'X', venue: 'wyjazd', matchTime: '11:00', notes: 'n', place: 'Kwidzyn' });
    expect(fromEvent({ ...e, type: 'turniej', title: 'T', allDay: true, startsAt: '2026-11-13T23:00:00.000Z', endsAt: '2026-11-15T23:00:00.000Z', details: {} }, '2027-06-30')).toMatchObject({ date: '2026-11-14', endDate: '2026-11-15', allDay: true, name: 'T' });
  });
});
