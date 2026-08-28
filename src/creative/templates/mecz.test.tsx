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
    expect(photoZone[0]).toBeLessThan(200); // zdjęcie zamiast bieli
    const tintZone = await sharp(png).extract({ left: 540, top: 300, width: 1, height: 1 }).raw().toBuffer();
    expect(tintZone[0]).toBeGreaterThan(tintZone[1] + 30); // czerwonawy ton zdjęcia
    const bandZone = await sharp(png).extract({ left: 10, top: 1300, width: 1, height: 1 }).raw().toBuffer();
    expect(bandZone[0]).toBeLessThan(30); // pas ciemny
  });

  it('wynik meczu ma ciemne piksele w strefie planszy wyniku (Anton)', async () => {
    const png = await renderPng(<MeczCreative post={post} photo={null} partnerBand={false} />);
    const rect = await sharp(png).extract({ left: 65, top: 420, width: 300, height: 120 }).raw().toBuffer();
    let hasDark = false;
    for (let i = 0; i < rect.length; i += 3) {
      if (rect[i] < 60) {
        hasDark = true;
        break;
      }
    }
    expect(hasDark).toBe(true);
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
});
