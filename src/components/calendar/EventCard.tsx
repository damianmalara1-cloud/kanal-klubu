import Link from 'next/link';
import { CAL_TYPE_LABEL, type CalEvent } from '@/domain/calendar';
import { teamColor } from '@/domain/calendarColors';
import { fmtHour } from './week';

export function EventCard({ e, secret, teams, past }: { e: CalEvent; secret: string; teams: string[]; past: boolean }) {
  const c = teamColor(e.teams[0] ?? null, teams);
  const when = e.allDay ? 'cały dzień' : `${fmtHour(e.startsAt)}–${fmtHour(e.endsAt)}`;
  return (
    <Link href={`/t/${secret}/kalendarz/${e.id}`} className={`cal-card${past ? ' cal-past' : ''}`} style={{ borderLeftColor: c.bg }}>
      <span className="cal-when">{when}</span>
      <span className="cal-teams">
        {e.teams.length === 0 ? (
          <span className="cal-team" style={{ background: c.bg, color: c.fg }}>cały klub</span>
        ) : (
          e.teams.map((t) => {
            const tc = teamColor(t, teams);
            return <span key={t} className="cal-team" style={{ background: tc.bg, color: tc.fg }}>{t}</span>;
          })
        )}
      </span>
      <strong className="cal-title">{e.type !== 'trening' && <em className="cal-type">{CAL_TYPE_LABEL[e.type]}</em>}{e.title}</strong>
      {(e.place || (e.type !== 'trening' && e.coaches.length > 0)) && (
        <span className="muted cal-sub">{[e.place, e.type !== 'trening' ? e.coaches.join(', ') : null].filter(Boolean).join(' · ')}</span>
      )}
    </Link>
  );
}
