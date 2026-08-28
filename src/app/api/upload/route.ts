import { isValidSecret } from '@/lib/access';
import { AppError, errMessage } from '@/lib/errors';
import { log } from '@/lib/log';
import { attachPhoto } from '@/workflow/draft';
export const maxDuration = 60;

/** Upload zdjęcia trenera: `?secret=` = COACH_LINK_SECRET, `?id=` = id draftu. Multipart `file` → zapis przez
 * `attachPhoto` (walidacja/resize/limit w Task 10). Błędy domenowe (`AppError`) mapują status 1:1, nieoczekiwane
 * błędy lecą do logu i wracają jako ogólny komunikat (nigdy po cichu — patrz `verify-gate.md`). */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!isValidSecret(url.searchParams.get('secret') ?? '')) return Response.json({ error: 'Nieprawidłowy link' }, { status: 404 });
  const id = url.searchParams.get('id') ?? '';
  try {
    const fd = await req.formData();
    const file = fd.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'Brak pliku' }, { status: 400 });
    const { path } = await attachPhoto(id, Buffer.from(await file.arrayBuffer()));
    return Response.json({ path });
  } catch (e) {
    if (e instanceof AppError) return Response.json({ error: e.message }, { status: e.status });
    log.error('upload', { err: errMessage(e) });
    return Response.json({ error: 'Nie udało się wgrać zdjęcia' }, { status: 500 });
  }
}
