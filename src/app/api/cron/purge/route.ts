import { getConfig } from '@/config';
import { purge } from '@/workflow/purge';
export const maxDuration = 60;

/** Cron dzienny (Vercel Cron → `Authorization: Bearer <CRON_SECRET>`). W trybie mock (`MOCK_EXTERNAL=true`,
 * testy/dev bez Supabase) auth pomijana. Zwraca tylko `purged`/`deletedDrafts` — `failed` (Task 12) zostaje
 * w logu (`log.error('purge', ...)` wewnątrz `purge()`), nie w publicznej odpowiedzi crona. */
export async function GET(req: Request) {
  const c = getConfig();
  if (!c.mockExternal && (!c.cronSecret || req.headers.get('authorization') !== `Bearer ${c.cronSecret}`)) {
    return new Response('unauthorized', { status: 401 });
  }
  const { purged, deletedDrafts } = await purge();
  return Response.json({ purged, deletedDrafts });
}
