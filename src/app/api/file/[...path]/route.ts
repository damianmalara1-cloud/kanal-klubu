import { getMemoryStorage } from '@/storage';

/** Serwuje pliki z `MemoryStorage` przez HTTP — istnieje TYLKO w trybie mock (`MOCK_EXTERNAL=true`),
 * gdzie nie ma prawdziwego Supabase Storage z signed URLs. Poza mockiem `getMemoryStorage()` zwraca
 * `null` i trasa zawsze 404. `?k=` to klucz instancji pamięci (nie sekret trenera) — chroni przed
 * przypadkowym dostępem, nie przed atakiem (mock nigdy nie stoi w produkcji). */
export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const mem = getMemoryStorage();
  if (!mem) return new Response('not found', { status: 404 });
  if (new URL(req.url).searchParams.get('k') !== mem.key) return new Response('not found', { status: 404 });
  const path = (await ctx.params).path.join('/');
  const buf = await mem.get(path);
  if (!buf) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': mem.contentType(path), 'Cache-Control': 'no-store' } });
}
