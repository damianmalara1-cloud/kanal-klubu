import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { isValidSecret } from '@/lib/access';
import { errMessage } from '@/lib/errors';
import { log } from '@/lib/log';
import { dayPl } from '@/lib/dates';
export const maxDuration = 30;

const NOT_FOUND = () => new Response('not found', { status: 404 });

/** Pobieranie planszy / zdjęcia jako plik: `what` = `plansza` | `zdjecie-<n>` (1-based). Same-origin + attachment = działa „Zapisz" na Androidzie i w share sheet iOS
 * (signed URLs Supabase są cross-origin i Safari ignoruje `download` na nich). Dostęp: `?secret=` = COACH_LINK_SECRET (link trenera, nie login) — porównanie stałoczasowe,
 * nigdy nie loguj wartości. Tylko posty `status === 'done'` mają pliki (szkice i przeczyszczone posty nie mają czego serwować). `post.purgedAt` sprawdzany JAWNIE
 * (nie tylko przez brak `creativePath`) — reguła retencji nie może zależeć wyłącznie od tego, że `purge()` wyzerował ścieżki. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; what: string }> }) {
  if (!isValidSecret(new URL(req.url).searchParams.get('secret') ?? '')) return NOT_FOUND();
  const { id, what } = await ctx.params;
  try {
    const post = await getRepo().get(id);
    if (!post || post.status !== 'done' || post.purgedAt) return NOT_FOUND();
    let path: string | null = null, ext = 'png', type = 'image/png', part = 'plansza';
    if (what === 'plansza') {
      path = post.creativePath;
    } else {
      const m = /^zdjecie-(\d{1,2})$/.exec(what);
      if (m) { path = post.photos[Number(m[1]) - 1] ?? null; ext = 'jpg'; type = 'image/jpeg'; part = `zdjecie-${Number(m[1])}`; }
    }
    if (!path) return NOT_FOUND();
    const buf = await getStorage().get(path);
    if (!buf) return NOT_FOUND();
    const day = dayPl(post.createdAt);
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': type,
        // `part` (plansza / zdjecie-N) w nazwie: bez niego wszystkie pliki z jednego posta lądują w Pobranych
        // pod tą samą nazwą i przeglądarka dokleja (1), (2)… — trener nie wie, co jest czym.
        'Content-Disposition': `attachment; filename="uks-banino-${post.type}-${day}-${part}.${ext}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    log.error('download', { id, what, err: errMessage(e) });
    return new Response('error', { status: 500 });
  }
}
