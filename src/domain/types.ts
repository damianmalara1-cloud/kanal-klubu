export type PostType = 'mecz' | 'turniej' | 'sukces' | 'ogloszenie';
export type PostStatus = 'draft' | 'done';
/** Jak zdjęcie wchodzi na planszę: `klub` = duotone czerń→czerwień, `oryginal` = kolory z aparatu. */
export type PhotoStyle = 'klub' | 'oryginal';
export const PHOTO_STYLES: PhotoStyle[] = ['klub', 'oryginal'];
/** Kadr zdjęcia na planszy (jak w generatorze grafik KPR): `zoom` = wielkość w % względem dopasowania, przy którym
 * zdjęcie dokładnie wypełnia pole (100), `dx`/`dy` = przesunięcie środka zdjęcia w px planszy 1080×1350 (+ w prawo / w dół).
 * Bez ograniczeń do krawędzi zdjęcia — odsłonięte pole wypełnia ciemne tło, więc każdy ruch suwaka jest widoczny. */
export interface PhotoCrop { dx: number; dy: number; zoom: number }
export const DEFAULT_CROP: PhotoCrop = { dx: 0, dy: 0, zoom: 100 };
export const CROP_ZOOM_MIN = 20, CROP_ZOOM_MAX = 300, CROP_OFFSET_MAX = 800;
/** Kadr z bazy/klienta do bezpiecznej postaci: null albo stary format `{x, y, zoom}` (migracja 0007, sprzed suwaków)
 * → domyślny. Rendery nie mogą się wywalić na wierszu, który przyszedł przed migracją 0008. */
export function normalizeCrop(c: unknown): PhotoCrop {
  const o = c as Partial<PhotoCrop> | null;
  if (!o || typeof o.dx !== 'number' || typeof o.dy !== 'number' || typeof o.zoom !== 'number') return { ...DEFAULT_CROP };
  return { dx: o.dx, dy: o.dy, zoom: o.zoom };
}
export const POST_TYPES: PostType[] = ['mecz', 'turniej', 'sukces', 'ogloszenie'];
export const TYPE_LABEL: Record<PostType, string> = { mecz: 'Mecz', turniej: 'Turniej', sukces: 'Sukces', ogloszenie: 'Ogłoszenie' };

export interface MeczForm { team: string | null; opponent: string; scoreHome: number; scoreAway: number; venue: 'dom' | 'wyjazd'; venueCity: string | null; notes: string | null }
export interface TurniejForm { name: string; place: string | null; team: string | null; result: string | null; notes: string | null }
export type SukcesKind = 'kadra' | 'medal' | 'wyroznienie' | 'inne';
export interface SukcesForm { names: string[]; kind: SukcesKind; team: string | null; details: string | null }
export interface OgloszenieForm { title: string; body: string; team: string | null; date: string | null; time: string | null; place: string | null }
export type PostForm = MeczForm | TurniejForm | SukcesForm | OgloszenieForm;

export interface Post {
  id: string; createdAt: string; updatedAt: string;
  author: string; type: PostType; form: PostForm;
  photos: string[]; heroPhoto: string | null; photoStyle: PhotoStyle; photoCrop: PhotoCrop;
  captionAi: string | null; caption: string | null; headline: string | null; kicker: string | null;
  creativePath: string | null; regenCount: number; factWarning: string | null;
  partnerInfo: boolean; status: PostStatus;
  purgeAfter: string | null; purgedAt: string | null; ip: string | null;
}
