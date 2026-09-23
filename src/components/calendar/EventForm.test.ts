import { describe, it, expect } from 'vitest';
import { emptyForm, toRaw } from './form';
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
});
