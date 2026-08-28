export type PickedPhoto = { key: string; blob: Blob; url: string };

export type ProcessFilesOptions = {
  max: number;
  maxBytes: number;
  makeUrl: (blob: Blob) => string;
};

type SizedFile = { size: number; name?: string };

/** Czysta logika dodawania zdjęć w `PhotoPicker`: dla każdego pliku próbuje `shrink`; gdy się nie uda, używa
 * oryginału tylko jeśli mieści się w `maxBytes` — inaczej zgłasza błąd i pomija plik (porażka `shrink` nie
 * może po cichu przepuścić zdjęcia, które i tak odrzuci `/api/upload`, patrz ruling 2 w task-16). Zatrzymuje
 * się po osiągnięciu `max`. Bez zależności od DOM/React — `shrink`/`makeUrl` wstrzykiwane, testowalne w node. */
export async function processFiles<F extends SizedFile>(
  files: F[],
  current: PickedPhoto[],
  shrink: (f: F) => Promise<Blob>,
  opts: ProcessFilesOptions,
): Promise<{ photos: PickedPhoto[]; errors: string[] }> {
  const photos = [...current];
  const errors: string[] = [];
  for (const f of files) {
    if (photos.length >= opts.max) break;
    let blob: Blob;
    try {
      blob = await shrink(f);
    } catch {
      if (f.size > opts.maxBytes) {
        errors.push(`Nie udało się przetworzyć zdjęcia (za duże)${f.name ? `: ${f.name}` : ''}`);
        continue;
      }
      blob = f as unknown as Blob;
    }
    photos.push({ key: `${Date.now()}-${photos.length}-${Math.random().toString(36).slice(2, 8)}`, blob, url: opts.makeUrl(blob) });
  }
  return { photos, errors };
}
