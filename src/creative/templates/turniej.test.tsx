import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderPng } from '../render';
import { TurniejCreative, resultStyle } from './turniej';
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

/** Skanuje wskazany prostokąt kanał-świadomie — zwraca true, jeśli WSZYSTKIE piksele są biel (kanał R > próg). */
async function isAllWhite(png: Buffer, region: { left: number; top: number; width: number; height: number }, threshold = 240) {
  const { data, info } = await sharp(png).extract(region).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] <= threshold) return false;
  }
  return true;
}

describe('resultStyle', () => {
  it('krótki wynik (≤20 znaków) — kapitaliki, duży rozmiar', () => {
    expect(resultStyle('2. miejsce')).toEqual({ text: '2. MIEJSCE', size: 138 });
  });
  it('średni wynik (21–30 znaków) — zwykła wielkość liter, średni rozmiar', () => {
    const s = 'Awans do finału wojewódzkiego, gratulacje!'.slice(0, 30); // slice gwarantuje dokładnie 30 znaków
    expect(s.length).toBe(30);
    expect(resultStyle(s)).toEqual({ text: s, size: 96 });
  });
  it('długi wynik (>30 znaków) — zwykła wielkość liter, mały rozmiar, NIE kapitaliki', () => {
    const s = '2. miejsce w kategorii młodzików';
    expect(s.length).toBeGreaterThan(30);
    const r = resultStyle(s);
    expect(r).toEqual({ text: s, size: 72 });
    expect(r.text).not.toBe(r.text.toLocaleUpperCase('pl-PL')); // nie jest kapitalikami — zawiera małe litery
  });
});

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
    expect(px[0]).toBeLessThan(235); // próg luźniejszy — antyaliasing/gradient przy krawędziach
    expect(px[0]).toBeGreaterThan(px[1]); // R > G
    expect(px[1]).toBeGreaterThan(px[2]); // G > B — ton czerwono-pomarańczowy (duotone lub fixture)
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

  it('długi wynik ("2. miejsce w kategorii młodzików") nie schodzi poniżej y=1170', async () => {
    const longPost = {
      ...post,
      form: { ...(post.form as object), result: '2. miejsce w kategorii młodzików' },
    } as unknown as Post;
    const png = await renderPng(<TurniejCreative post={longPost} photo={null} partnerBand={false} />);
    expect(await isAllWhite(png, { left: 0, top: 1170, width: 1080, height: 10 })).toBe(true);
  });

  it('nazwa turnieju bez spacji (60 znaków, limit schematu forms.ts) nie wyjeżdża poza prawą krawędź planszy', async () => {
    const longNamePost = {
      ...post,
      form: { ...(post.form as object), name: 'A'.repeat(60) },
    } as unknown as Post;
    const png = await renderPng(<TurniejCreative post={longNamePost} photo={null} partnerBand={false} />);
    // wiersz nazwy (RedBar + nazwa) w wariancie typograficznym zaczyna się ok. y≈636 — skanujemy szeroki pas
    // przy prawej krawędzi canvasu (poza pudełkiem width:800), żeby złapać ucieczkę tekstu niezależnie od
    // liczby zawiniętych linii
    expect(await isAllWhite(png, { left: 1070, top: 600, width: 10, height: 250 })).toBe(true);
  });
});
