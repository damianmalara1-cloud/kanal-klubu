import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getConfig } from '@/config';
import { isValidSecret } from '@/lib/access';
import { nowIso } from '@/lib/dates';
import { parseMonth, shiftMonth } from '@/admin/month';
import { fmtMonth } from '@/admin/format';
import { listMonth } from '@/workflow/calendar';
import { teamColor } from '@/domain/calendarColors';
import { dotsByDay, monthGrid } from '@/components/calendar/month';
import { dayLabel } from '@/components/calendar/week';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Miesiąc — Kanał Klubu', robots: { index: false, follow: false } };
type SP = Record<string, string | string[] | undefined>;
const WD = ['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const DOTS_MAX = 4;

export default async function MonthPage({ params, searchParams }: { params: Promise<{ secret: string }>; searchParams: Promise<SP> }) {
  const { secret } = await params;
  if (!isValidSecret(secret)) notFound();
  const sp = await searchParams;
  const m = parseMonth(typeof sp.m === 'string' ? sp.m : undefined, nowIso());
  const raw = typeof sp.team === 'string' ? sp.team : undefined;
  const team: string | null | undefined = raw === undefined || raw === '' ? undefined : raw === 'klub' ? null : raw;
  // Jawny `&team=` (nawet pusty, dla "Wszystkie") musi przeżyć nawigację miesiącami i powrót do tygodnia —
  // ten sam wzorzec co `teamQ` w `/kalendarz` (patrz komentarz tam), `TeamFilter` tu nie wraca (hrefy hard-wired
  // do widoku tygodnia, patrz task-9-report.md).
  const teamQ = raw !== undefined ? `&team=${encodeURIComponent(raw)}` : '';
  const { teams } = getConfig();
  const events = await listMonth(m, team);
  const grid = monthGrid(m);
  const dots = dotsByDay(events, m);
  return (
    <main className="wrap">
      <p className="kicker"><Link href={`/t/${secret}/kalendarz`}>← Kalendarz</Link></p>
      <h1>{fmtMonth(m)}</h1>
      <nav className="adm-nav" aria-label="Miesiąc">
        <Link href={`/t/${secret}/kalendarz/miesiac?m=${shiftMonth(m, -1)}${teamQ}`}>← poprzedni</Link>
        <Link href={`/t/${secret}/kalendarz?d=${m}-01${teamQ}`}>Tydzień</Link>
        <Link href={`/t/${secret}/kalendarz/miesiac?m=${shiftMonth(m, 1)}${teamQ}`}>następny →</Link>
      </nav>
      <section className="cal-grid" aria-label={`Miesiąc ${fmtMonth(m)}`}>
        {WD.map((w) => <div key={w} className="cal-wd">{w}</div>)}
        {grid.map(({ date, inMonth }) => {
          const dayTeams = dots.get(date) ?? [];
          const shown = dayTeams.slice(0, DOTS_MAX);
          const extra = dayTeams.length - shown.length;
          return (
            <Link key={date} href={`/t/${secret}/kalendarz?d=${date}${teamQ}`} aria-label={dayLabel(date)} className={`cal-cell${inMonth ? '' : ' cal-out'}`}>
              {Number(date.slice(8, 10))}
              {shown.length > 0 && (
                <span className="cal-cell-dots" aria-hidden="true">
                  {shown.map((t, i) => <i key={i} className="cal-dot" style={{ background: teamColor(t, teams).bg }} />)}
                  {extra > 0 && <b>+{extra}</b>}
                </span>
              )}
            </Link>
          );
        })}
      </section>
    </main>
  );
}
