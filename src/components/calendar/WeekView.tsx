import Link from 'next/link';
import type { CalEvent } from '@/domain/calendar';
import { addDays, nowIso, todayPl } from '@/lib/dates';
import { EventCard } from './EventCard';
import { dayLabel, groupByDay, teamHref } from './week';

export function WeekView({ secret, weekStartDate, events, teams, rawTeam }: { secret: string; weekStartDate: string; events: CalEvent[]; teams: string[]; rawTeam: string | undefined }) {
  const days = groupByDay(weekStartDate, events);
  const now = nowIso(), today = todayPl();
  // `rawTeam` niezdefiniowany = filtr jeszcze nie wybrany (link bez `team=`, TeamFilter dociąga zapis z
  // localStorage); jawny string (nawet '' — "Wszystkie") musi lecieć dalej przez `teamHref`, inaczej
  // przełączanie tygodni gubi wybór i odbija do ostatnio zapisanego filtra.
  const nav = (d: string) => (rawTeam !== undefined ? teamHref(secret, d, rawTeam) : `/t/${secret}/kalendarz?d=${d}`);
  return (
    <>
      <nav className="adm-nav" aria-label="Tydzień">
        <Link href={nav(addDays(weekStartDate, -7))}>← poprzedni</Link>
        <Link href={nav(today)}>Dziś</Link>
        <Link href={nav(addDays(weekStartDate, 7))}>następny →</Link>
      </nav>
      {days.map((d) => (
        <section key={d.date} className={`cal-day${d.date === today ? ' cal-today' : ''}`} aria-label={dayLabel(d.date)}>
          <header className="cal-day-h">
            <h2>{dayLabel(d.date)}</h2>
            <Link className="cal-add" href={`/t/${secret}/kalendarz/nowy?date=${d.date}`} aria-label={`Dodaj ${dayLabel(d.date)}`}>+</Link>
          </header>
          {d.events.length === 0 ? <p className="muted cal-empty">—</p> : d.events.map((e) => <EventCard key={e.id} e={e} secret={secret} teams={teams} past={e.endsAt < now} />)}
        </section>
      ))}
    </>
  );
}
