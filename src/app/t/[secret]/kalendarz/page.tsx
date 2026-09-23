import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getConfig } from '@/config';
import { isValidSecret } from '@/lib/access';
import { todayPl, weekStart } from '@/lib/dates';
import { listWeek } from '@/workflow/calendar';
import { TeamFilter } from '@/components/calendar/TeamFilter';
import { WeekView } from '@/components/calendar/WeekView';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kalendarz — Kanał Klubu', robots: { index: false, follow: false } };
type SP = Record<string, string | string[] | undefined>;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ secret: string }>; searchParams: Promise<SP> }) {
  const { secret } = await params;
  if (!isValidSecret(secret)) notFound();
  const sp = await searchParams;
  const d = typeof sp.d === 'string' && DATE.test(sp.d) ? sp.d : todayPl();
  const raw = typeof sp.team === 'string' ? sp.team : undefined;
  const team: string | null | undefined = raw === undefined || raw === '' ? undefined : raw === 'klub' ? null : raw;
  const ws = weekStart(d);
  const { teams } = getConfig();
  const events = await listWeek(ws, team);
  // Jawny `&team=` (nawet pusty, dla "Wszystkie") musi przeżyć do linku „Miesiąc" — inaczej przejście na
  // widok miesiąca gubi wybrany filtr, tak samo jak przy nawigacji tygodniami (patrz `WeekView`/`teamHref`).
  const teamQ = raw !== undefined ? `&team=${encodeURIComponent(raw)}` : '';
  return (
    <main className="wrap">
      <p className="kicker"><Link href={`/t/${secret}`}>← Kanał Klubu</Link></p>
      <h1>Kalendarz</h1>
      <nav className="cal-links" aria-label="Kalendarz — widoki">
        <Link href={`/t/${secret}/kalendarz/miesiac?m=${ws.slice(0, 7)}${teamQ}`}>Miesiąc</Link>
        <Link href={`/t/${secret}/kalendarz/telefon`}>Do telefonu</Link>
        <Link href={`/t/${secret}/kalendarz/nowy?date=${d}`}>+ Dodaj</Link>
      </nav>
      <TeamFilter secret={secret} date={d} teams={teams} team={team} hasParam={raw !== undefined} />
      <WeekView secret={secret} weekStartDate={ws} events={events} teams={teams} rawTeam={raw} />
    </main>
  );
}
