import type { CalEvent } from '@/domain/calendar';
import { teamSlug } from '@/domain/calendarSlug';
import { addDays, localToIso, weekdayOf } from '@/lib/dates';
export function monthGrid(month: string): { date: string; inMonth: boolean }[] {
  const first = `${month}-01`;
  const start = addDays(first, 1 - weekdayOf(first));
  const out: { date: string; inMonth: boolean }[] = [];
  for (let d = start; out.length < 42; d = addDays(d, 1)) {
    const inMonth = d.startsWith(month);
    if (out.length >= 35 && !inMonth && weekdayOf(d) === 1) break;
    out.push({ date: d, inMonth });
  }
  return out;
}
export function dotsByDay(events: CalEvent[], month: string): Map<string, (string | null)[]> {
  const m = new Map<string, (string | null)[]>();
  for (const { date } of monthGrid(month)) {
    const from = localToIso(date, '00:00'), to = localToIso(addDays(date, 1), '00:00');
    const teams: (string | null)[] = [];
    for (const e of events) if (e.startsAt < to && e.endsAt > from && !teams.includes(e.team)) teams.push(e.team);
    if (teams.length) m.set(date, teams);
  }
  return m;
}
export function webcalLinks(appUrl: string, secret: string, teams: string[]) {
  const host = appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const mk = (label: string, slug: string) => ({ label, slug, url: `webcal://${host}/api/ics/${secret}/${slug}.ics` });
  return [mk('Cały klub', 'klub'), ...teams.map((t) => mk(t, teamSlug(t)))];
}
