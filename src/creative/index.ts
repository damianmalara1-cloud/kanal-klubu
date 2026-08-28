import type { Post } from '@/domain/types';
import { log } from '@/lib/log';
import { duotone } from './duotone';
import { renderPng } from './render';
import { MeczCreative } from './templates/mecz';
import { TurniejCreative } from './templates/turniej';
import { SukcesCreative } from './templates/sukces';
import { OgloszenieCreative } from './templates/ogloszenie';
import type { CreativeProps } from './types';

const TEMPLATES = { mecz: MeczCreative, turniej: TurniejCreative, sukces: SukcesCreative, ogloszenie: OgloszenieCreative } as const;

/**
 * Punkt wejścia renderowania kreacji: duotone zdjęcia bohatera (jeśli jest), wybór szablonu po
 * `post.type`, PNG 1080×1350. Gdy duotone albo render ze zdjęciem rzuci (np. zepsuty bufor zdjęcia),
 * pada z powrotem na wariant typograficzny zamiast wywalać cały request — publikacja posta nie może
 * się zablokować przez jedno wadliwe zdjęcie.
 */
export async function renderCreative(post: Post, heroPhoto: Buffer | null, opts: { partnerBand: boolean }): Promise<Buffer> {
  const Template = TEMPLATES[post.type];
  let photo: string | null = null;
  if (heroPhoto) {
    try {
      photo = 'data:image/jpeg;base64,' + (await duotone(heroPhoto)).toString('base64');
    } catch (e) {
      log.warn('duotone nieudany — wariant typograficzny', { post: post.id, err: String(e) });
    }
  }
  const props: CreativeProps = { post, photo, partnerBand: opts.partnerBand };
  try {
    return await renderPng(Template(props));
  } catch (e) {
    if (!photo) throw e;
    log.warn('render ze zdjęciem nieudany — wariant typograficzny', { post: post.id, err: String(e) });
    return renderPng(Template({ ...props, photo: null }));
  }
}
