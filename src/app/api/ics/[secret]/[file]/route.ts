import { getConfig } from '@/config';
import { getCalendar } from '@/calendar';
import { buildIcs } from '@/calendar/ics';
import { teamColor } from '@/domain/calendarColors';
import { slugMap } from '@/domain/calendarSlug';
import { isValidSecret } from '@/lib/access';
import { addDays, localToIso, nowIso, dayPl } from '@/lib/dates';
import { errMessage } from '@/lib/errors';
import { log } from '@/lib/log';
export const dynamic = 'force-dynamic';
const GREY = '#8A8A8A';

/** Subskrybowalny kalendarz .ics — `klub.ics` (cały klub) albo `<slug-druzyny>.ics` (jedna grupa), za tym samym
 * `COACH_LINK_SECRET` co reszta linków trenera (Task 9 wysyła `webcal://…/api/ics/<secret>/<slug>.ics`).
 * Okno `listRange` (60 dni wstecz, koniec sezonu +90 dni) ma pokazać niedawną historię i cały sezon naraz —
 * kalendarz subskrybowany raz nie może „urwać się" przy końcu sezonu. */
export async function GET(_req: Request, ctx: { params: Promise<{ secret: string; file: string }> }) {
  const { secret, file } = await ctx.params;
  if (!isValidSecret(secret) || !file.endsWith('.ics')) return new Response('not found', { status: 404 });
  const slug = file.slice(0, -4);
  const { teams, seasonEnd } = getConfig();
  const team = slug === 'klub' ? undefined : slugMap(teams).get(slug);
  if (slug !== 'klub' && team === undefined) return new Response('not found', { status: 404 });
  const today = dayPl(nowIso());
  const from = localToIso(addDays(today, -60), '00:00'), to = localToIso(addDays(seasonEnd, 90), '00:00');
  try {
    const events = await getCalendar().listRange(from, to, team);
    const name = team ? `UKS Banino · ${team}` : 'UKS Banino · cały klub';
    const body = buildIcs({ name, color: team ? teamColor(team, teams).bg : GREY, events });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'public, max-age=300', 'content-disposition': `inline; filename="uks-banino-${slug}.ics"` } });
  } catch (e) {
    log.error('ics', { slug, err: errMessage(e) });
    return new Response('temporarily unavailable', { status: 503, headers: { 'retry-after': '300' } });
  }
}
