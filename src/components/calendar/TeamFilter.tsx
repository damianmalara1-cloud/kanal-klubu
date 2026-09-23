'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teamColor } from '@/domain/calendarColors';
import { teamHref } from './week';
const KEY = 'kk-cal-team';
export function TeamFilter({ secret, date, teams, team, hasParam }: { secret: string; date: string; teams: string[]; team: string | null | undefined; hasParam: boolean }) {
  const router = useRouter();
  // Jawny `team=` w URL nawet dla `''` ("Wszystkie") — inaczej brak parametru wygląda jak „jeszcze nie wybrano"
  // i efekt niżej odbija z powrotem do zapisanego w localStorage filtra (patrz komentarz przy `teamHref`).
  const href = (t: string) => teamHref(secret, date, t);
  useEffect(() => {
    try {
      if (hasParam) localStorage.setItem(KEY, team === null ? 'klub' : (team ?? ''));
      else { const saved = localStorage.getItem(KEY); if (saved) router.replace(href(saved)); }
    } catch { /* tryb prywatny */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasParam, team]);
  const current = team === null ? 'klub' : (team ?? '');
  return (
    <>
      <div className="chips" role="group" aria-label="Filtr drużyny">
        <Link className="chip" href={href('')} aria-current={current === '' ? 'true' : undefined}>Wszystkie</Link>
        {teams.map((t) => <Link key={t} className="chip" href={href(t)} aria-current={current === t ? 'true' : undefined}>{t}</Link>)}
        {/* Wartość URL zostaje 'klub' (linki/localStorage/ics), ale filtr per drużyna (I6) i tak dociąga
            wydarzenia całego klubu — ten chip filtruje je z powrotem, więc nazwa musi to odróżniać. */}
        <Link className="chip" href={href('klub')} aria-current={current === 'klub' ? 'true' : undefined}>tylko klubowe</Link>
      </div>
      <ul className="cal-legend" aria-label="Kolory drużyn">
        {teams.map((t) => <li key={t}><i style={{ background: teamColor(t, teams).bg }} />{t}</li>)}
      </ul>
    </>
  );
}
