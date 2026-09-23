import { describe, it, expect } from 'vitest';
import { localToIso, isoToLocal, addDays, weekdayOf, weekStart, tzOffsetMin } from './dates';

describe('dates — Europe/Warsaw', () => {
  it('localToIso: lato +2, zima +1', () => {
    expect(localToIso('2026-09-29', '16:30')).toBe('2026-09-29T14:30:00.000Z');
    expect(localToIso('2026-10-27', '16:30')).toBe('2026-10-27T15:30:00.000Z');
  });
  it('localToIso: dzień zmiany czasu 25.10.2026 — 16:30 to już czas zimowy', () => {
    expect(localToIso('2026-10-25', '16:30')).toBe('2026-10-25T15:30:00.000Z');
    expect(localToIso('2026-10-25', '01:30')).toBe('2026-10-24T23:30:00.000Z'); // przed cofnięciem, +2
  });
  it('isoToLocal odwraca localToIso i daje dzień tygodnia 1=pon', () => {
    expect(isoToLocal('2026-09-29T14:30:00.000Z')).toEqual({ date: '2026-09-29', time: '16:30', weekday: 2 });
    expect(isoToLocal('2026-10-04T21:59:00.000Z')).toEqual({ date: '2026-10-04', time: '23:59', weekday: 7 });
  });
  it('addDays / weekdayOf / weekStart — arytmetyka kalendarzowa bez strefy', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(weekdayOf('2026-09-28')).toBe(1);
    expect(weekStart('2026-10-04')).toBe('2026-09-28');
    expect(weekStart('2026-09-28')).toBe('2026-09-28');
  });
  it('tzOffsetMin: 60 zimą, 120 latem', () => {
    expect(tzOffsetMin(new Date('2026-01-15T12:00:00Z'))).toBe(60);
    expect(tzOffsetMin(new Date('2026-07-15T12:00:00Z'))).toBe(120);
  });
});
