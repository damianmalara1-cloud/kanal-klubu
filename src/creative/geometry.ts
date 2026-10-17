import type { MeczForm, PhotoCrop, Post, PostType } from '@/domain/types';

// Bez zależności od satori/assetów — moduł importuje też przeglądarka (podgląd kadru na żywo).
export const SLANT_DEG = 10; // token DS --angle-slant — jeden kąt w całym systemie
export const SLANT_DROP = Math.round(1080 * Math.tan((SLANT_DEG * Math.PI) / 180)); // 190 px spadku linii cięcia na szerokości planszy

/** Wysokość pola zdjęcia na planszy (px przy 1080×1350) per szablon. Jedno źródło dla szablonów i dla podglądu
 * kadru na żywo w przeglądarce — bez tego podgląd i prawdziwa plansza rozjechałyby się przy zmianie szablonu. */
export function photoHeight(type: PostType, partnerBand: boolean): number {
  switch (type) {
    case 'mecz': return 700;
    case 'turniej': return 600;
    case 'sukces': return 770;
    case 'ogloszenie': return partnerBand ? 600 : 700;
  }
}

/** Prostokąt zdjęcia w polu 1080×`height` dla danego kadru (px planszy; może wychodzić poza pole — przycina je
 * `overflow`, a odsłonięte miejsce wypełnia tło). Bazą jest dopasowanie „cover" wyśrodkowane w polu; `zoom` skaluje
 * wokół środka, `dx`/`dy` przesuwają. Jedno źródło dla renderu (`PhotoTop`) i podglądu na żywo w przeglądarce.
 * `natW`/`natH` = wymiary zdjęcia po obróceniu EXIF (liczy się tylko proporcja). */
export function photoRect(natW: number, natH: number, height: number, crop: PhotoCrop) {
  const scale = Math.max(1080 / natW, height / natH) * (crop.zoom / 100);
  const w = natW * scale, h = natH * scale;
  return { left: (1080 - w) / 2 + crop.dx, top: (height - h) / 2 + crop.dy, width: w, height: h };
}

/** Napis w prawym górnym rogu planszy meczu (leży NA zdjęciu, więc podgląd kadru na żywo musi go odtworzyć). */
export function venueLabel(post: Pick<Post, 'type' | 'form'>): string | null {
  if (post.type !== 'mecz') return null;
  const f = post.form as MeczForm;
  return f.venue === 'dom' ? 'Banino' : `wyjazd${f.venueCity ? ` · ${f.venueCity}` : ''}`;
}
