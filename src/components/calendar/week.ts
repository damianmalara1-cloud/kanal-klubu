import type { CalEvent } from '@/domain/calendar';
import { addDays, isoToLocal, localToIso, weekdayOf } from '@/lib/dates';
const WD = ['', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
export const dayLabel = (date: string): string => `${WD[weekdayOf(date)]} ${date.slice(8, 10)}.${date.slice(5, 7)}`;
export const fmtHour = (iso: string): string => isoToLocal(iso).time;
/** Link do `/t/[secret]/kalendarz` z jawnym `team=` — nawet dla `t === ''` ("Wszystkie"), inaczej brak parametru
 * w URL wygląda jak „jeszcze nie wybrano", a `TeamFilter` odbija z powrotem do zapisanego w localStorage filtra. */
export const teamHref = (secret: string, date: string, t: string): string =>
  `/t/${secret}/kalendarz?d=${date}&team=${encodeURIComponent(t)}`;
/** Wydarzenie trafia do każdego dnia, z którym się nakłada (koniec o północy = poprzedni dzień). */
export function groupByDay(weekStartDate: string, events: CalEvent[]): { date: string; events: CalEvent[] }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStartDate, i);
    const from = localToIso(date, '00:00'), to = localToIso(addDays(date, 1), '00:00');
    return { date, events: events.filter((e) => e.startsAt < to && e.endsAt > from) };
  });
}
