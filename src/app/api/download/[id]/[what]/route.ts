import { getRepo } from '@/db';
import { getStorage } from '@/storage';
import { isValidSecret } from '@/lib/access';
import { errMessage } from '@/lib/errors';
import { log } from '@/lib/log';
export const maxDuration = 30;

const NOT_FOUND = () => new Response('not found', { status: 404 });

/** Pobieranie planszy / zdjęcia jako plik: `what` = `plansza` | `zdjecie-<n>` (1-based). Same-origin + attachment = działa „Zapisz" na Androidzie i w share sheet iOS
 * (signed URLs Supabase są cross-origin i Safari ignoruje `download` na nich). Dostęp: `?secret=` = COACH_LINK_SECRET (link trenera, nie login) — porównanie stałoczasowe,
 * nigdy nie loguj wartości. Tylko posty `status === 'done'` mają pliki (szkice i przeczyszczone posty nie mają czego serwować). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; what: string }> }) {
  if (!isValidSecret(new URL(req.url).searchParams.get('secret') ?? '')) return NOT_FOUND();
  const { id, what } = await ctx.params;
  try {
    const post = await getRepo().get(id);
    if (!post || post.status !== 'done') return NOT_FOUND();
    let path: string | null = null, ext = 'png', type = 'image/png';
    if (what === 'plansza') {
      path = post.creativePath;
    } else {
      const m = /^zdjecie-(\d{1,2})$/.exec(what);
      if (m) { path = post.photos[Number(m[1]) - 1] ?? null; ext = 'jpg'; type = 'image/jpeg'; }
    }
    if (!path) return NOT_FOUND();
    const buf = await getStorage().get(path);
    if (!buf) return NOT_FOUND();
    const day = post.createdAt.slice(0, 10);
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': type,
        'Content-Disposition': `attachment; filename="uks-banino-${post.type}-${day}.${ext}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    log.error('download', { id, what, err: errMessage(e) });
    return new Response('error', { status: 500 });
  }
}
