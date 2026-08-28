'use client';
import { useRef, useState } from 'react';
import { MAX_PHOTOS, MAX_UPLOAD_BYTES } from '@/domain/limits';
import { processFiles, removePhoto, uploadedPhotosPhrase, type PickedPhoto } from './photoProcess';

export type { PickedPhoto };

export async function shrinkImage(file: File, maxSide = 2048): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Brak kontekstu 2D');
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.85));
}

export function PhotoPicker({
  photos,
  onChange,
  heroIndex,
  onHero,
  max = MAX_PHOTOS,
  restoredUploads = 0,
}: {
  photos: PickedPhoto[];
  onChange: (p: PickedPhoto[]) => void;
  heroIndex: number;
  onHero: (i: number) => void;
  max?: number;
  /** Zdjęcia wgrane w poprzednim podejściu (odtworzone z localStorage), których miniatur nie da się
   * pokazać — blob żyje tylko w tamtej karcie. Zero = normalna sesja, nic nie dopisujemy. */
  restoredUploads?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function add(files: FileList | null) {
    if (!files) return;
    const { photos: next, errors: errs } = await processFiles(Array.from(files), photos, shrinkImage, {
      max,
      maxBytes: MAX_UPLOAD_BYTES,
      makeUrl: URL.createObjectURL,
    });
    setErrors(errs);
    onChange(next);
    if (input.current) input.current.value = '';
  }

  function remove(i: number) {
    const gone = photos[i];
    const r = removePhoto(photos, heroIndex, i);
    if (r.photos === photos) return;
    // Podgląd trzyma blob w pamięci karty do końca życia dokumentu — po usunięciu zwalniamy go ręcznie.
    try {
      URL.revokeObjectURL(gone.url);
    } catch {
      /* brak URL.revokeObjectURL — nic nie tracimy poza pamięcią podglądu */
    }
    if (r.hero !== heroIndex) onHero(r.hero);
    onChange(r.photos);
  }

  return (
    <div className="field">
      <label htmlFor="photos">
        Zdjęcia ({photos.length}/{max})
      </label>
      <input ref={input} id="photos" type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} aria-label="Dodaj zdjęcia" />
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Wrzucaj tylko zdjęcia osób ze zgodą wizerunkową. Kliknij zdjęcie, żeby wybrać je na planszę.
      </p>
      {restoredUploads > 0 && (
        <p className="muted" style={{ fontSize: 13, margin: 0 }} role="status">
          {restoredUploads} {uploadedPhotosPhrase(restoredUploads)} z poprzedniej próby — dodanie nowych zaczyna post od nowa.
        </p>
      )}
      {errors.length > 0 && (
        <p className="error" role="alert">
          {errors.join('; ')}
        </p>
      )}
      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((p, i) => (
            <div className="thumb-wrap" key={p.key}>
              <button type="button" className="thumb" aria-pressed={i === heroIndex} aria-label={`Zdjęcie ${i + 1} na planszę`} onClick={() => onHero(i)}>
                {p.preview ? <img src={p.url} alt="" /> : <span className="thumb-noprev">brak podglądu</span>}
                {i === heroIndex && <span>plansza</span>}
              </button>
              <button type="button" className="thumb-del" aria-label={`Usuń zdjęcie ${i + 1}`} onClick={() => remove(i)}>
                usuń
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
