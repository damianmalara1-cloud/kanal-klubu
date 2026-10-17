import sharp from 'sharp';
import { normalizeCrop, type Post } from '@/domain/types';
import { log } from '@/lib/log';
import { duotone, originalPhoto } from './duotone';
import { renderPng } from './render';
import { MeczCreative } from './templates/mecz';
import { TurniejCreative } from './templates/turniej';
import { SukcesCreative } from './templates/sukces';
import { OgloszenieCreative } from './templates/ogloszenie';
import type { CreativeProps } from './types';

const TEMPLATES = { mecz: MeczCreative, turniej: TurniejCreative, sukces: SukcesCreative, ogloszenie: OgloszenieCreative } as const;

/**
 * Punkt wejścia renderowania kreacji: duotone zdjęcia bohatera (albo oryginał, gdy `photoStyle === 'oryginal'`), wybór szablonu po
 * `post.type`, PNG 1080×1350. Gdy duotone albo render ze zdjęciem rzuci (np. zepsuty bufor zdjęcia),
 * pada z powrotem na wariant typograficzny zamiast wywalać cały request — publikacja posta nie może
 * się zablokować przez jedno wadliwe zdjęcie.
 */
export async function renderCreative(post: Post, heroPhoto: Buffer | null, opts: { partnerBand: boolean }): Promise<Buffer> {
  const Template = TEMPLATES[post.type];
  let photo: string | null = null;
  let photoSize: { w: number; h: number } | null = null;
  if (heroPhoto) {
    try {
      // Przy powiększeniu bierzemy z oryginału więcej pikseli, żeby wycinek nie był rozmyty (sufit 2400 px — rozmiar data URI).
      const zoom = normalizeCrop(post.photoCrop).zoom;
      const maxSide = Math.min(2400, Math.max(1400, Math.round((1400 * zoom) / 100)));
      const img = post.photoStyle === 'oryginal' ? await originalPhoto(heroPhoto, maxSide) : await duotone(heroPhoto, { maxSide });
      const meta = await sharp(img).metadata();
      photo = 'data:image/jpeg;base64,' + img.toString('base64');
      photoSize = meta.width && meta.height ? { w: meta.width, h: meta.height } : null;
    } catch (e) {
      log.warn('duotone nieudany — wariant typograficzny', { post: post.id, err: String(e) });
    }
  }
  const props: CreativeProps = { post, photo, photoSize, partnerBand: opts.partnerBand };
  try {
    return await renderPng(Template(props));
  } catch (e) {
    if (!photo) throw e;
    log.warn('render ze zdjęciem nieudany — wariant typograficzny', { post: post.id, err: String(e) });
    return renderPng(Template({ ...props, photo: null }));
  }
}
