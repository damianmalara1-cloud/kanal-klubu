import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderPng } from '../render';
import { TurniejCreative } from './turniej';
import { fakePhoto } from '../testUtils';
import type { Post } from '@/domain/types';

const post = {
  id: '1',
  type: 'turniej',
  kicker: 'Kaszubski Turniej · VII edycja',
  headline: '2. MIEJSCE',
  form: {
    name: 'Kaszubski Turniej Piłki Ręcznej',
    place: 'Banino',
    team: 'młodzicy (2011+)',
    result: '2. miejsce',
    notes: null,
  },
} as unknown as Post;

describe('TurniejCreative', () => {
  it('oba warianty renderują 1080×1350', async () => {
    for (const photo of [null, await fakePhoto()]) {
      const png = await renderPng(<TurniejCreative post={post} photo={photo} partnerBand={false} />);
      const meta = await sharp(png).metadata();
      expect(meta.width).toBe(1080);
      expect(meta.height).toBe(1350);
    }
  });

  it('wariant typograficzny: strefa próbkowania biała (brak zdjęcia)', async () => {
    const png = await renderPng(<TurniejCreative post={post} photo={null} partnerBand={false} />);
    const px = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(px[0]).toBeGreaterThan(240);
  });

  it('wariant ze zdjęciem: strefa próbkowania nie jest biała', async () => {
    const png = await renderPng(<TurniejCreative post={post} photo={await fakePhoto()} partnerBand={false} />);
    const px = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(px[0]).toBeLessThan(200);
  });

  it('pas partnerów: identyczne wiersze 0–1179, różne wiersze 1230–1350', async () => {
    const off = await renderPng(<TurniejCreative post={post} photo={null} partnerBand={false} />);
    const on = await renderPng(<TurniejCreative post={post} photo={null} partnerBand={true} />);
    const offTop = await sharp(off).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    const onTop = await sharp(on).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    expect(Buffer.compare(offTop, onTop)).toBe(0);
    const offBand = await sharp(off).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    const onBand = await sharp(on).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    expect(Buffer.compare(offBand, onBand)).not.toBe(0);
  });
});
