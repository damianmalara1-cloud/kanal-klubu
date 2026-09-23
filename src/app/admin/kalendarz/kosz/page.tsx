import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isAdmin, isAdminEnabled } from '@/admin/auth';
import { fmtTime, fmtWhen } from '@/admin/format';
import { getCalendar } from '@/calendar';
import { calSummary } from '@/domain/calendar';
import { CALENDAR_TRASH_DAYS } from '@/workflow/purge';
import { nowIso } from '@/lib/dates';
import { plural } from '@/lib/plural';
import { adminRestoreCalendarAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kosz kalendarza — Admin', robots: { index: false, follow: false } };

/** Ile dni zostało w koszu, zanim cron skasuje wpis na trwałe — zaokrąglone w dół, nigdy poniżej zera
 * (cron mógł jeszcze nie zdążyć przejechać dnia, w którym termin już przekroczył `CALENDAR_TRASH_DAYS`). */
const daysLeft = (deletedAt: string, now: string): number =>
  Math.max(0, CALENDAR_TRASH_DAYS - Math.floor((Date.parse(now) - Date.parse(deletedAt)) / 86_400_000));
const daysLeftLabel = (deletedAt: string, now: string): string => {
  const n = daysLeft(deletedAt, now);
  return `${n} ${plural(n, 'dzień', 'dni', 'dni')}`;
};
/** Klucz `seriesId|deletedAt` — nie samo `seriesId` (I1): terminy tej samej serii usunięte przy różnych
 * okazjach (inny moment usunięcia) mają osobne liczniki i osobne przyciski „Przywróć serię", żeby przycisk
 * przy jednym wierszu nie ożywiał terminów usuniętych przy zupełnie innej okazji. */
const seriesKey = (seriesId: string, deletedAt: string) => `${seriesId}|${deletedAt}`;

export default async function CalendarTrashPage() {
  if (!isAdminEnabled()) notFound();
  if (!(await isAdmin())) redirect('/admin');
  const rows = await getCalendar().listDeleted();
  const now = nowIso();
  const seriesCounts = new Map<string, number>();
  for (const r of rows) if (r.seriesId && r.deletedAt) {
    const key = seriesKey(r.seriesId, r.deletedAt);
    seriesCounts.set(key, (seriesCounts.get(key) ?? 0) + 1);
  }

  return (
    <main className="wrap adm-wrap">
      <p className="kicker"><Link href="/admin">← Panel admina</Link></p>
      <h1>Kosz kalendarza</h1>
      <p className="muted">Wydarzenia usunięte z kalendarza trafiają tu na {CALENDAR_TRASH_DAYS} dni, zanim cron skasuje je na trwałe.</p>

      {rows.length === 0 ? (
        <p className="muted">Kosz jest pusty.</p>
      ) : (
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Co</th><th>Termin</th><th>Usunął</th><th>Kiedy</th><th>Zniknie za</th><th>Akcja</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>{calSummary(e)}</td>
                  <td>{fmtWhen(e.startsAt)}</td>
                  <td>{e.deletedBy ?? '—'}</td>
                  <td>{e.deletedAt ? fmtTime(e.deletedAt) : '—'}</td>
                  <td>{e.deletedAt ? daysLeftLabel(e.deletedAt, now) : '—'}</td>
                  <td>
                    <form action={adminRestoreCalendarAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="chip">Przywróć</button>
                    </form>
                    {e.seriesId && e.deletedAt && (
                      <form action={adminRestoreCalendarAction}>
                        <input type="hidden" name="seriesId" value={e.seriesId} />
                        <input type="hidden" name="deletedAt" value={e.deletedAt} />
                        <button type="submit" className="chip">Przywróć serię ({seriesCounts.get(seriesKey(e.seriesId, e.deletedAt))})</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
