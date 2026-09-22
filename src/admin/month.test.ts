import { describe, it, expect } from 'vitest';
import { currentMonth, monthRange, parseMonth, shiftMonth } from './month';

describe('miesiące w czasie polskim', () => {
  it('currentMonth liczy po czasie Warszawy, nie UTC', () => {
    expect(currentMonth('2026-09-15T12:00:00.000Z')).toBe('2026-09');
    expect(currentMonth('2026-09-30T22:30:00.000Z')).toBe('2026-10'); // 00:30 1 października w Polsce
  });

  it('shiftMonth przez granicę roku', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-09', 0)).toBe('2026-09');
  });

  it('monthRange: północ czasu polskiego, czas letni i zimowy', () => {
    expect(monthRange('2026-09')).toEqual({ fromIso: '2026-08-31T22:00:00.000Z', toIso: '2026-09-30T22:00:00.000Z' });
    expect(monthRange('2026-10')).toEqual({ fromIso: '2026-09-30T22:00:00.000Z', toIso: '2026-10-31T23:00:00.000Z' });
    expect(monthRange('2026-12')).toEqual({ fromIso: '2026-11-30T23:00:00.000Z', toIso: '2026-12-31T23:00:00.000Z' });
  });

  it('parseMonth: poprawny parametr albo bieżący miesiąc', () => {
    const now = '2026-09-22T12:00:00.000Z';
    expect(parseMonth('2026-08', now)).toBe('2026-08');
    expect(parseMonth('2026-13', now)).toBe('2026-09');
    expect(parseMonth(undefined, now)).toBe('2026-09');
    expect(parseMonth('wrzesień', now)).toBe('2026-09');
  });
});
