import { CAL_TYPE_LABEL, calSummary, type CalEvent } from '@/domain/calendar';
import { isoToLocal } from '@/lib/dates';

export const escapeText = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** RFC 5545 §3.1: linie do 75 oktetów, kontynuacja od spacji. Łamiemy po znakach, licząc bajty — nigdy w środku znaku UTF-8. */
export function foldLine(s: string): string {
  const out: string[] = []; let cur = '', bytes = 0;
  for (const ch of s) {
    const b = Buffer.byteLength(ch, 'utf8');
    const limit = out.length === 0 ? 75 : 74; // kontynuacja ma spację na początku
    if (bytes + b > limit) { out.push(cur); cur = ch; bytes = b; } else { cur += ch; bytes += b; }
  }
  out.push(cur);
  return out.map((l, i) => (i ? ` ${l}` : l)).join('\r\n');
}
const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const local = (iso: string) => { const { date, time } = isoToLocal(iso); return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`; };
const dateOnly = (iso: string) => isoToLocal(iso).date.replace(/-/g, '');

export const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Warsaw',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

function description(e: CalEvent): string {
  const parts: string[] = [];
  if (e.type === 'mecz' && e.details.matchTime) parts.push(`Mecz o ${e.details.matchTime}${e.details.venue === 'wyjazd' ? ' (wyjazd)' : ''}`);
  else if (e.type === 'mecz' && e.details.venue) parts.push(e.details.venue === 'dom' ? 'Mecz u siebie' : 'Wyjazd');
  if (e.coaches.length) parts.push(`Trener: ${e.coaches.join(', ')}`);
  if (e.details.notes) parts.push(e.details.notes);
  if (e.type === 'inne' && parts.length === 0) parts.push(CAL_TYPE_LABEL.inne);
  return parts.join('\n');
}

export function buildIcs(o: { name: string; color: string; events: CalEvent[]; now?: string }): string {
  const now = stamp(o.now ?? new Date().toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UKS Banino//Kanal Klubu//PL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(o.name)}`, 'X-WR-TIMEZONE:Europe/Warsaw', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H', `COLOR:${o.color}`,
    ...VTIMEZONE,
  ];
  for (const e of o.events) {
    const seq = Math.max(0, Math.round((Date.parse(e.updatedAt) - Date.parse(e.createdAt)) / 60_000));
    lines.push('BEGIN:VEVENT', `UID:${e.id}@kanal-klubu`, `DTSTAMP:${now}`, `LAST-MODIFIED:${stamp(e.updatedAt)}`, `CREATED:${stamp(e.createdAt)}`, `SEQUENCE:${seq}`);
    if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${dateOnly(e.startsAt)}`, `DTEND;VALUE=DATE:${dateOnly(e.endsAt)}`);
    else lines.push(`DTSTART;TZID=Europe/Warsaw:${local(e.startsAt)}`, `DTEND;TZID=Europe/Warsaw:${local(e.endsAt)}`);
    lines.push(`SUMMARY:${escapeText(calSummary(e))}`);
    if (e.place) lines.push(`LOCATION:${escapeText(e.place)}`);
    const d = description(e); if (d) lines.push(`DESCRIPTION:${escapeText(d)}`);
    lines.push(`COLOR:${o.color}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
