export type PostType = 'mecz' | 'turniej' | 'sukces' | 'ogloszenie';
export type PostStatus = 'draft' | 'done';
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
  photos: string[]; heroPhoto: string | null;
  captionAi: string | null; caption: string | null; headline: string | null; kicker: string | null;
  creativePath: string | null; regenCount: number; factWarning: string | null;
  partnerInfo: boolean; status: PostStatus;
  purgeAfter: string | null; purgedAt: string | null; ip: string | null;
}
