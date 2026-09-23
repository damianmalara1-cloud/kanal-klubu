import { describe, it, expect } from 'vitest';
import { buildIcs, escapeText, foldLine } from './ics';
import type { CalEvent } from '@/domain/calendar';
const base: CalEvent = { id: '11111111-1111-4111-8111-111111111111', type: 'trening', team: 'młodziczki (2011+)', title: 'Trening · Ania', startsAt: '2026-09-29T14:30:00.000Z', endsAt: '2026-09-29T16:00:00.000Z', allDay: false, place: 'Hala SP Banino, ul. Lotnicza', coaches: ['Ania'], details: { notes: 'przynieść; wodę' }, seriesId: null, createdBy: 'Ania', updatedBy: 'Ania', createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-21T10:00:00.000Z', deletedAt: null, deletedBy: null };
describe('ics', () => {
  it('escape: przecinek, średnik, nowa linia, backslash', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
  });
  it('fold: linie > 75 bajtów łamane z wcięciem, bez rozcinania znaku UTF-8', () => {
    const s = 'SUMMARY:' + 'ą'.repeat(60); // 8 + 120 bajtów
    const out = foldLine(s);
    const lines = out.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(Buffer.byteLength(l, 'utf8')).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((l) => l.startsWith(' '))).toBe(true);
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(s);
  });
  it('wydarzenie z godzinami: TZID, SUMMARY, LOCATION z escape, DESCRIPTION, COLOR, SEQUENCE rośnie z updatedAt', () => {
    const ics = buildIcs({ name: 'UKS Banino · młodziczki (2011+)', color: '#C12E26', events: [base], now: '2026-09-23T12:00:00.000Z' });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics).toContain('X-WR-CALNAME:UKS Banino · młodziczki (2011+)');
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:Europe/Warsaw');
    expect(ics).toContain('UID:11111111-1111-4111-8111-111111111111@kanal-klubu');
    expect(ics).toContain('DTSTART;TZID=Europe/Warsaw:20260929T163000');
    expect(ics).toContain('DTEND;TZID=Europe/Warsaw:20260929T180000');
    expect(ics).toContain('SUMMARY:młodziczki (2011+) · Trening · Ania');
    expect(ics).toContain('LOCATION:Hala SP Banino\\, ul. Lotnicza');
    expect(ics).toContain('DESCRIPTION:Trener: Ania\\nprzynieść\\; wodę');
    expect(ics).toContain('COLOR:#C12E26');
    expect(ics).toContain('LAST-MODIFIED:20260921T100000Z');
    expect(ics).toContain('SEQUENCE:1440'); // (updatedAt − createdAt) w minutach
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('całodniowe: VALUE=DATE, DTEND dzień po; mecz wyjazdowy: „mecz o 11:00" w opisie', () => {
    const t = { ...base, id: '22222222-2222-4222-8222-222222222222', type: 'turniej' as const, title: 'Mikołajkowy', allDay: true, startsAt: '2026-11-13T23:00:00.000Z', endsAt: '2026-11-15T23:00:00.000Z', details: {} };
    const m = { ...base, id: '33333333-3333-4333-8333-333333333333', type: 'mecz' as const, title: 'vs X', details: { opponent: 'X', venue: 'wyjazd' as const, matchTime: '11:00' } };
    const ics = buildIcs({ name: 'n', color: '#000000', events: [t, m] });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261114'); expect(ics).toContain('DTEND;VALUE=DATE:20261116');
    expect(ics).toContain('SUMMARY:młodziczki (2011+) · Turniej · Mikołajkowy');
    expect(ics).toContain('DESCRIPTION:Mecz o 11:00 (wyjazd)\\nTrener: Ania');
  });
});
