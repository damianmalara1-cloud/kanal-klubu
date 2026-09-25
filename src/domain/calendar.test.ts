import { describe, it, expect } from 'vitest';
import { parseCalInput, parseSeriesInput, seriesDates, inputToFields, SERIES_MAX, calSummary } from './calendar';

const ctx = { teams: ['młodziczki (2011+)', 'młodzicy (2011+)'], coachNames: ['Ania', 'Krzysiek'] };
const trening = { type: 'trening', teams: ['młodziczki (2011+)'], date: '2026-09-29', startTime: '16:30', endTime: '18:00', place: 'Hala SP Banino', coaches: ['Ania'] };

describe('parseCalInput', () => {
  it('trening: tytuł z trenerów, godziny w UTC', () => {
    const f = inputToFields(parseCalInput(trening, ctx));
    expect(f).toMatchObject({ type: 'trening', teams: ['młodziczki (2011+)'], title: 'Trening · Ania', startsAt: '2026-09-29T14:30:00.000Z', endsAt: '2026-09-29T16:00:00.000Z', allDay: false, place: 'Hala SP Banino', coaches: ['Ania'], details: {} });
  });
  it('koniec ≤ początek → błąd z etykietą „Koniec"', () => {
    expect(() => parseCalInput({ ...trening, endTime: '16:30' }, ctx)).toThrow(/Koniec/);
    expect(() => parseCalInput({ ...trening, startTime: '23:30', endTime: '00:30' }, ctx)).toThrow(/Koniec/);
  });
  it('mecz wyjazdowy: tytuł „vs …", details z rywalem i godziną meczu', () => {
    const f = inputToFields(parseCalInput({ type: 'mecz', teams: ['młodzicy (2011+)'], date: '2026-10-10', startTime: '08:00', endTime: '15:00', place: 'Kwidzyn', coaches: [], opponent: 'MTS Kwidzyn', venue: 'wyjazd', matchTime: '11:00' }, ctx));
    expect(f.title).toBe('vs MTS Kwidzyn');
    expect(f.details).toEqual({ opponent: 'MTS Kwidzyn', venue: 'wyjazd', matchTime: '11:00' });
  });
  it('turniej całodniowy 2 dni: północ→północ dnia po', () => {
    const f = inputToFields(parseCalInput({ type: 'turniej', teams: ['młodziczki (2011+)'], date: '2026-11-14', endDate: '2026-11-15', allDay: true, name: 'Turniej Mikołajkowy', coaches: ['Ania', 'Krzysiek'] }, ctx));
    expect(f).toMatchObject({ title: 'Turniej Mikołajkowy', allDay: true, startsAt: '2026-11-13T23:00:00.000Z', endsAt: '2026-11-15T23:00:00.000Z' });
  });
  it('„cały klub" (team null) tylko przy „inne"; drużyna spoza listy → błąd', () => {
    expect(parseCalInput({ type: 'inne', teams: [], title: 'Zebranie kadry', date: '2026-10-01', startTime: '19:00', endTime: '20:00', coaches: [] }, ctx).teams).toEqual([]);
    expect(() => parseCalInput({ ...trening, teams: [] }, ctx)).toThrow(/Drużyna/);
    expect(() => parseCalInput({ ...trening, teams: ['nieznana'] }, ctx)).toThrow(/Drużyna/);
  });
  it('kilka drużyn naraz: obie w `teams`, duplikat zlany, jedna spoza listy → błąd; SUMMARY „A + B"', () => {
    const v = parseCalInput({ ...trening, teams: ['młodziczki (2011+)', 'młodzicy (2011+)', 'młodziczki (2011+)'] }, ctx);
    expect(v.teams).toEqual(['młodziczki (2011+)', 'młodzicy (2011+)']);
    expect(inputToFields(v).teams).toEqual(['młodziczki (2011+)', 'młodzicy (2011+)']);
    expect(() => parseCalInput({ ...trening, teams: ['młodziczki (2011+)', 'nieznana'] }, ctx)).toThrow(/Drużyna: „nieznana"/);
    expect(calSummary({ type: 'turniej', teams: ['młodziczki (2011+)', 'młodzicy (2011+)'], title: 'Mikołajki', coaches: [] })).toBe('młodziczki (2011+) + młodzicy (2011+) · Turniej · Mikołajki');
  });
  it('trener spoza listy → błąd; notes max 300', () => {
    expect(() => parseCalInput({ ...trening, coaches: ['Obcy'] }, ctx)).toThrow(/Trener/);
    expect(() => parseCalInput({ ...trening, notes: 'x'.repeat(301) }, ctx)).toThrow(/Uwagi/);
  });
  it('nieznany typ wydarzenia → błąd z etykietą „Typ wydarzenia"', () => {
    expect(() => parseCalInput({ ...trening, type: 'zly' }, ctx)).toThrow(/Typ wydarzenia/);
  });
});

describe('seriesDates', () => {
  it('wt+czw od środy 30.09 do 15.10 → czw 1.10 pierwszy, bez środy', () => {
    expect(seriesDates('2026-09-30', '2026-10-15', [2, 4])).toEqual(['2026-10-01', '2026-10-06', '2026-10-08', '2026-10-13', '2026-10-15']);
  });
  it('„do" przed startem → błąd; brak dni → błąd; > SERIES_MAX → błąd', () => {
    expect(() => seriesDates('2026-10-01', '2026-09-30', [2])).toThrow(/Do/);
    expect(() => seriesDates('2026-10-01', '2026-10-30', [])).toThrow(/Dni/);
    expect(() => seriesDates('2026-01-01', '2030-12-31', [1, 2, 3, 4, 5])).toThrow(new RegExp(String(SERIES_MAX)));
  });
  it('parseSeriesInput: dni 1–7 bez duplikatów, until w formacie daty', () => {
    expect(parseSeriesInput({ weekdays: ['2', '4', '2'], until: '2027-06-30' })).toEqual({ weekdays: [2, 4], until: '2027-06-30' });
    expect(() => parseSeriesInput({ weekdays: [8], until: '2027-06-30' })).toThrow(/Dni tygodnia/);
    expect(() => parseSeriesInput({ weekdays: [1], until: 'x' })).toThrow(/Do/);
  });
});

describe('calSummary', () => {
  it('trening bez dublowania słowa, reszta z etykietą typu, cały klub = UKS Banino', () => {
    expect(calSummary({ type: 'trening', teams: ['młodziczki (2011+)'], title: 'Trening · Ania', coaches: ['Ania'] })).toBe('młodziczki (2011+) · Trening · Ania');
    expect(calSummary({ type: 'mecz', teams: ['młodzicy (2011+)'], title: 'vs MTS Kwidzyn', coaches: [] })).toBe('młodzicy (2011+) · Mecz · vs MTS Kwidzyn');
    expect(calSummary({ type: 'inne', teams: [], title: 'Zebranie kadry', coaches: [] })).toBe('UKS Banino · Inne · Zebranie kadry');
  });
});
