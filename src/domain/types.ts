export type PostType = 'mecz' | 'turniej' | 'sukces' | 'ogloszenie';
export type PostStatus = 'draft' | 'done';
/** Jak zdjęcie wchodzi na planszę: `klub` = duotone czerń→czerwień, `oryginal` = kolory z aparatu. */
export type PhotoStyle = 'klub' | 'oryginal';
export const PHOTO_STYLES: PhotoStyle[] = ['klub', 'oryginal'];
/** Kadr zdjęcia na planszy: `x`/`y` = punkt zaczepienia w % (jak CSS `object-position`: 0 = lewa/górna krawędź
 * zdjęcia, 100 = prawa/dolna), `zoom` = przybliżenie w % ponad dopasowanie `cover` (100 = całe pole, bez przybliżenia). */
export interface PhotoCrop { x: number; y: number; zoom: number }
export const DEFAULT_CROP: PhotoCrop = { x: 50, y: 50, zoom: 100 };
export const CROP_ZOOM_MAX = 250;
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
