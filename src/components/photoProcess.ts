/** `preview: false` = przeglądarka nie potrafiła zdekodować pliku (HEIC albo w ogóle nie obraz), więc `url`
 * nie pokaże miniatury. Plik zostaje w wysyłce (serwer bywa mądrzejszy od przeglądarki), ale kafel musi to
 * powiedzieć wprost — pusty kwadrat wyglądał jak działające zdjęcie (UAT D-01). */
export type PickedPhoto = { key: string; blob: Blob; url: string; preview: boolean };

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
    let preview = true;
    try {
      blob = await shrink(f);
    } catch {
      if (f.size > opts.maxBytes) {
        errors.push(`Nie udało się przetworzyć zdjęcia (za duże)${f.name ? `: ${f.name}` : ''}`);
        continue;
      }
      errors.push(`Nie udało się podejrzeć zdjęcia${f.name ? ` ${f.name}` : ''} — jeśli to nie jest zdjęcie, usuń je`);
      preview = false;
      blob = f as unknown as Blob;
    }
    photos.push({ key: `${Date.now()}-${photos.length}-${Math.random().toString(36).slice(2, 8)}`, blob, url: opts.makeUrl(blob), preview });
  }
  return { photos, errors };
}

/** Usuwa zdjęcie spod `index` i koryguje wskaźnik planszy tak, żeby dalej wskazywał to samo zdjęcie co
 * przed usunięciem: skasowana plansza → wraca na pierwsze, skasowane zdjęcie przed planszą → wskaźnik w dół.
 * Bez tego trener, który usunie zdjęcie z lewej, dostaje na planszy inne niż wybrał — po cichu. */
export function removePhoto(photos: PickedPhoto[], hero: number, index: number): { photos: PickedPhoto[]; hero: number } {
  if (index < 0 || index >= photos.length) return { photos, hero };
  const next = photos.filter((_, i) => i !== index);
  const nextHero = index === hero || next.length === 0 ? 0 : index < hero ? hero - 1 : hero;
  return { photos: next, hero: nextHero };
}
