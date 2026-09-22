import Link from 'next/link';
import { getEvents } from '@/events';
import { EVENT_TYPES } from '@/events/types';
import { currentMonth, monthRange, parseMonth, shiftMonth } from '@/admin/month';
import { monthStats, timeline } from '@/admin/stats';
import { EVENT_LABEL, eventText, fmtMonth, fmtPln, fmtTime, fmtUsd } from '@/admin/format';
import { usdPln } from '@/lib/nbp';
import { nowIso } from '@/lib/dates';
import { adminLogoutAction } from './actions';

type SP = Record<string, string | string[] | undefined>;
type Q = { m: string; a?: string; t?: string };

const one = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : undefined);

function href(base: Q, patch: Partial<Q>): string {
  const next = { ...base, ...patch };
  const q = new URLSearchParams({ m: next.m });
  if (next.a) q.set('a', next.a);
  if (next.t) q.set('t', next.t);
  return `/admin?${q.toString()}`;
}

export async function Dashboard({ sp }: { sp: SP }) {
  const now = nowIso();
  const m = parseMonth(one(sp.m), now);
  const a = one(sp.a);
  const t = one(sp.t);
  const range = monthRange(m);
  const [events, rate] = await Promise.all([getEvents().listRange(range.fromIso, range.toIso), usdPln()]);
  const s = monthStats(events, range, now);
  const rows = timeline(events, { author: a, type: t });
  const money = (usd: number) => (rate ? `${fmtUsd(usd)} · ≈ ${fmtPln(usd, rate)}` : fmtUsd(usd));
  const base: Q = { m, a, t };
  const isCurrent = m === currentMonth(now);

  return (
    <main className="wrap adm-wrap">
      <p className="kicker">UKS Banino · Kanał Klubu</p>
      <div className="adm-nav">
        <h1>Panel admina</h1>
        <form action={adminLogoutAction}><button type="submit" className="chip">Wyloguj</button></form>
      </div>

      <nav className="adm-nav" aria-label="Miesiąc">
        <Link href={href(base, { m: shiftMonth(m, -1) })}>← poprzedni</Link>
        <strong>{fmtMonth(m)}</strong>
        {isCurrent ? <span className="muted">następny →</span> : <Link href={href(base, { m: shiftMonth(m, 1) })}>następny →</Link>}
      </nav>

      <section className="adm-kpis" aria-label="Podsumowanie miesiąca">
        <div className="adm-kpi">
          <b>{money(s.costUsd)}</b>
          <span>koszt AI{s.unknownCostCalls > 0 ? ` + ${s.unknownCostCalls} wywołań bez danych o koszcie` : ''}</span>
        </div>
        <div className="adm-kpi">
          <b>{s.forecastUsd === null ? '—' : money(s.forecastUsd)}</b>
          <span>prognoza na koniec miesiąca</span>
        </div>
        <div className="adm-kpi">
          <b>{s.done}</b>
          <span>gotowe posty · {s.abandoned} porzuconych szkiców</span>
        </div>
        <div className="adm-kpi">
          <b>{s.generations}</b>
          <span>generacji AI, w tym {s.regens} regeneracji · błędy AI: {s.aiFailures}{s.budgetFailures > 0 ? ` (brak środków: ${s.budgetFailures})` : ''}</span>
        </div>
      </section>

      <h2>Trenerzy</h2>
      {s.trainers.length === 0 ? (
        <p className="muted">Brak aktywności w tym miesiącu.</p>
      ) : (
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Trener</th><th>Gotowe</th><th>Porzucone</th><th>Generacje</th><th>Regeneracje</th><th>% zmian</th><th>Koszt</th><th>Ostatnio</th></tr>
            </thead>
            <tbody>
              {s.trainers.map((r) => (
                <tr key={r.author}>
                  <td><Link href={href(base, { a: r.author })}>{r.author}</Link></td>
                  <td>{r.done}</td>
                  <td>{r.abandoned}</td>
                  <td>{r.generations}</td>
                  <td>{r.regens}</td>
                  <td>{r.avgChangedPct === null ? '—' : `${r.avgChangedPct}%`}</td>
                  <td>{fmtUsd(r.costUsd)}{r.unknownCostCalls > 0 ? ` (+${r.unknownCostCalls} bez danych)` : ''}</td>
                  <td>{fmtTime(r.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Oś zdarzeń</h2>
      <div className="chips" role="group" aria-label="Filtr typu zdarzenia">
        <Link className="chip" href={href(base, { t: undefined })} aria-current={!t ? 'true' : undefined}>Wszystkie</Link>
        {EVENT_TYPES.map((et) => (
          <Link key={et} className="chip" href={href(base, { t: et })} aria-current={t === et ? 'true' : undefined}>{EVENT_LABEL[et]}</Link>
        ))}
      </div>
      {a && <p className="muted">Trener: <strong>{a}</strong> · <Link href={href(base, { a: undefined })}>pokaż wszystkich</Link></p>}
      {rows.length === 0 ? (
        <p className="muted">Brak zdarzeń.</p>
      ) : (
        <ul className="list">
          {rows.map((e) => (
            <li key={e.id}>
              <span>
                {fmtTime(e.at)} · {e.author ?? 'admin'} · {eventText(e)}
                {e.costUsd !== null && (e.type === 'ai_generated' || e.type === 'ai_failed') ? ` · ${fmtUsd(e.costUsd)}` : ''}
              </span>
              {e.postId && <Link href={`/admin/post/${e.postId}`}>→ post</Link>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
