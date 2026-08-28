import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderPng } from '../render';
import { MeczCreative } from './mecz';
import { fakePhoto } from '../testUtils';
import type { Post } from '@/domain/types';

const post = {
  id: '1',
  type: 'mecz',
  kicker: 'Liga wojewódzka · młodziczki',
  headline: '24 : 18',
  form: {
    team: 'młodziczki (2011+)',
    opponent: 'SPR Wybrzeże II Gdańsk',
    scoreHome: 24,
    scoreAway: 18,
    venue: 'dom',
    venueCity: null,
    notes: null,
  },
} as unknown as Post;

async function dims(png: Buffer) {
  const meta = await sharp(png).metadata();
  return { width: meta.width, height: meta.height };
}

/** Skanuje wskazany prostokąt kanał-świadomie (RGB lub RGBA) — zwraca true, jeśli trafi na ciemny piksel (kanał R < próg). */
async function hasDarkPixel(png: Buffer, region: { left: number; top: number; width: number; height: number }, threshold = 60) {
  const { data, info } = await sharp(png).extract(region).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] < threshold) return true;
  }
  return false;
}

/** Skanuje wskazany prostokąt kanał-świadomie — zwraca true, jeśli WSZYSTKIE piksele są biel (kanał R > próg). */
async function isAllWhite(png: Buffer, region: { left: number; top: number; width: number; height: number }, threshold = 240) {
  const { data, info } = await sharp(png).extract(region).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] <= threshold) return false;
  }
  return true;
}

describe('MeczCreative', () => {
  it('typograficzny bez pasa — wymiary, brak zdjęcia w strefie próbkowania', async () => {
    const png = await renderPng(<MeczCreative post={post} photo={null} partnerBand={false} />);
    expect(await dims(png)).toEqual({ width: 1080, height: 1350 });
    const photoZone = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(photoZone[0]).toBeGreaterThan(240); // brak zdjęcia — tło białe
    const bandZone = await sharp(png).extract({ left: 10, top: 1300, width: 1, height: 1 }).raw().toBuffer();
    expect(bandZone[0]).toBeGreaterThan(240); // pas wyłączony — biel
  });

  it('ze zdjęciem i pasem — wymiary, zdjęcie w strefie próbkowania, ciemny pas', async () => {
    const png = await renderPng(<MeczCreative post={post} photo={await fakePhoto()} partnerBand={true} />);
    expect(await dims(png)).toEqual({ width: 1080, height: 1350 });
    const photoZone = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(photoZone[0]).toBeLessThan(235); // zdjęcie zamiast bieli (próg luźniejszy — antyaliasing/gradient przy krawędziach)
    expect(photoZone[0]).toBeGreaterThan(photoZone[1]); // R > G
    expect(photoZone[1]).toBeGreaterThan(photoZone[2]); // G > B — ton czerwono-pomarańczowy (duotone lub fixture)
    const bandZone = await sharp(png).extract({ left: 10, top: 1300, width: 1, height: 1 }).raw().toBuffer();
    expect(bandZone[0]).toBeLessThan(30); // pas ciemny
  });

  it('wynik meczu ma ciemne piksele w strefie planszy wyniku (Anton)', async () => {
    const png = await renderPng(<MeczCreative post={post} photo={null} partnerBand={false} />);
    expect(await hasDarkPixel(png, { left: 65, top: 420, width: 300, height: 120 })).toBe(true);
  });

  it('pas partnerów: identyczne wiersze 0–1179, różne wiersze 1230–1350', async () => {
    const off = await renderPng(<MeczCreative post={post} photo={null} partnerBand={false} />);
    const on = await renderPng(<MeczCreative post={post} photo={null} partnerBand={true} />);
    const offTop = await sharp(off).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    const onTop = await sharp(on).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    expect(Buffer.compare(offTop, onTop)).toBe(0);
    const offBand = await sharp(off).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    const onBand = await sharp(on).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    expect(Buffer.compare(offBand, onBand)).not.toBe(0);
  });

  it('rywal o maksymalnej długości (48 znaków) nie wjeżdża w zarezerwowaną strefę 1180–1229 przed pasem', async () => {
    const longPost = {
      ...post,
      form: { ...(post.form as object), opponent: 'A'.repeat(48) },
    } as unknown as Post;
    const png = await renderPng(<MeczCreative post={longPost} photo={await fakePhoto()} partnerBand={true} />);
    expect(await isAllWhite(png, { left: 0, top: 1180, width: 1080, height: 50 })).toBe(true);
  });
});
