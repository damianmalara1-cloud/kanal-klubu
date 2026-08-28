import { getConfig } from '@/config';
import { purge } from '@/workflow/purge';
import { log } from '@/lib/log';
export const maxDuration = 60;

/** Cron dzienny (Vercel Cron → `Authorization: Bearer <CRON_SECRET>`). W trybie mock (`MOCK_EXTERNAL=true`,
 * testy/dev bez Supabase) auth pomijana. Zwraca cały wynik `purge()` (Task 12) łącznie z `failed` — operator
 * musi widzieć nieudane pozycje w logu crona Vercela, nie tylko w `log.error('purge', ...)` wewnątrz `purge()`. */
export async function GET(req: Request) {
  const c = getConfig();
  if (!c.mockExternal && (!c.cronSecret || req.headers.get('authorization') !== `Bearer ${c.cronSecret}`)) {
    // Bez tego wpisu odrzucony cron jest w logu Vercela nie do odróżnienia od crona, który w ogóle nie
    // przyszedł. Logujemy TYLKO flagę, czy sekret jest ustawiony po stronie serwera — nigdy wartości
    // (ani tej z configu, ani tej z nagłówka).
    log.error('cron: unauthorized', { hasSecret: !!c.cronSecret });
    return new Response('unauthorized', { status: 401 });
  }
  const result = await purge();
  log.info('purge', result);
  return Response.json(result);
}
