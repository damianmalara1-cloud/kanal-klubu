import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderPng } from '../render';
import { SukcesCreative } from './sukces';
import { OgloszenieCreative } from './ogloszenie';
import { fakePhoto } from '../testUtils';
import type { Post } from '@/domain/types';

const sukcesPost = {
  id: '1',
  type: 'sukces',
  kicker: 'Powołanie · kadra Polski',
  headline: 'POWOŁANIE DO KADRY',
  form: {
    names: ['Żaneta Ćwikła', 'Zuzanna Kowalska'],
    kind: 'kadra',
    team: 'młodziczki (2011+)',
    details: 'Zgrupowanie 12–19.04 w Płocku',
  },
} as unknown as Post;

const oglPost = {
  id: '2',
  type: 'ogloszenie',
  kicker: 'Nabór 2026/27',
  headline: 'ZACZNIJ GRAĆ W BANINIE',
  form: {
    title: 'Nabór',
    body: 'Zapraszamy dzieci i młodzież na treningi piłki ręcznej w Baninie.',
    team: null,
    date: 'wtorki i czwartki',
    time: '17:00',
    place: 'hala SP2 Banino',
  },
} as unknown as Post;

async function dims(png: Buffer) {
  const meta = await sharp(png).metadata();
  return { width: meta.width, height: meta.height };
}

/** Skanuje wskazany prostokąt kanał-świadomie — zwraca true, jeśli trafi na ciemny piksel (kanał R < próg). */
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

describe('SukcesCreative', () => {
  it('oba warianty renderują 1080×1350', async () => {
    for (const photo of [null, await fakePhoto()]) {
      const png = await renderPng(<SukcesCreative post={sukcesPost} photo={photo} partnerBand={false} />);
      expect(await dims(png)).toEqual({ width: 1080, height: 1350 });
    }
  });

  it('wariant typograficzny: strefa próbkowania biała (brak zdjęcia)', async () => {
    const png = await renderPng(<SukcesCreative post={sukcesPost} photo={null} partnerBand={false} />);
    const px = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(px[0]).toBeGreaterThan(240);
  });

  it('wariant ze zdjęciem: strefa próbkowania nie jest biała, ton czerwono-pomarańczowy', async () => {
    const png = await renderPng(<SukcesCreative post={sukcesPost} photo={await fakePhoto()} partnerBand={false} />);
    const px = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(px[0]).toBeLessThan(235);
    expect(px[0]).toBeGreaterThan(px[1]);
    expect(px[1]).toBeGreaterThan(px[2]);
  });

  it('pas partnerów: identyczne wiersze 0–1179, różne wiersze 1230–1350', async () => {
    const off = await renderPng(<SukcesCreative post={sukcesPost} photo={null} partnerBand={false} />);
    const on = await renderPng(<SukcesCreative post={sukcesPost} photo={null} partnerBand={true} />);
    const offTop = await sharp(off).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    const onTop = await sharp(on).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    expect(Buffer.compare(offTop, onTop)).toBe(0);
    const offBand = await sharp(off).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    const onBand = await sharp(on).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    expect(Buffer.compare(offBand, onBand)).not.toBe(0);
  });

  it('nazwiska (bohater, Barlow 600) i nagłówek (drugorzędny, Anton) mają ciemne piksele', async () => {
    const pngPhoto = await renderPng(<SukcesCreative post={sukcesPost} photo={await fakePhoto()} partnerBand={false} />);
    expect(await hasDarkPixel(pngPhoto, { left: 65, top: 850, width: 900, height: 300 })).toBe(true);
    const pngTypo = await renderPng(<SukcesCreative post={sukcesPost} photo={null} partnerBand={false} />);
    expect(await hasDarkPixel(pngTypo, { left: 65, top: 330, width: 900, height: 350 })).toBe(true);
  });

  it('40-znakowy nagłówek + 3 nazwiska po 40 znaków (limity forms.ts), zdjęcie i pas partnerów: nic nie wjeżdża w 1180–1229, nazwiska nadal mają tusz', async () => {
    const stress = {
      ...sukcesPost,
      headline: 'A'.repeat(60), // komponent utnie do 40 znaków (.slice(0, 40))
      form: { ...(sukcesPost.form as object), names: ['Ż'.repeat(40), 'Ż'.repeat(40), 'Ż'.repeat(40)] },
    } as unknown as Post;
    const png = await renderPng(<SukcesCreative post={stress} photo={await fakePhoto()} partnerBand={true} />);
    expect(await isAllWhite(png, { left: 0, top: 1180, width: 1080, height: 50 })).toBe(true);
    // Zaczynamy skan od y=800 (poniżej zdjęcia i ukosu PhotoTop, które legalnie zajmuje pełną szerokość) —
    // niżej powinno być wyłącznie białe tło poza treścią; ten pas łapie tekst uciekający poza prawą krawędź.
    expect(await isAllWhite(png, { left: 1070, top: 800, width: 10, height: 380 })).toBe(true);
    // nazwiska (bohater planszy) nadal mają tusz mimo maksymalnej długości — nie zostały "wyskalowane w nicość"
    expect(await hasDarkPixel(png, { left: 65, top: 850, width: 950, height: 200 })).toBe(true);
  });

  it('wariant typograficzny: 3 nazwiska po 40 znaków + opis 120 znaków (limit forms.ts) nie wjeżdżają w pas partnerów', async () => {
    const stress = {
      ...sukcesPost,
      form: { ...(sukcesPost.form as object), names: ['Ż'.repeat(40), 'Ż'.repeat(40), 'Ż'.repeat(40)], details: 'A'.repeat(120) },
    } as unknown as Post;
    const png = await renderPng(<SukcesCreative post={stress} photo={null} partnerBand={true} />);
    expect(await isAllWhite(png, { left: 0, top: 1180, width: 1080, height: 50 })).toBe(true);
    expect(await isAllWhite(png, { left: 1070, top: 0, width: 10, height: 1180 })).toBe(true);
  });
});

describe('OgloszenieCreative', () => {
  it('oba warianty renderują 1080×1350', async () => {
    for (const photo of [null, await fakePhoto()]) {
      const png = await renderPng(<OgloszenieCreative post={oglPost} photo={photo} partnerBand={false} />);
      expect(await dims(png)).toEqual({ width: 1080, height: 1350 });
    }
  });

  it('wariant typograficzny: strefa próbkowania biała (brak zdjęcia)', async () => {
    const png = await renderPng(<OgloszenieCreative post={oglPost} photo={null} partnerBand={false} />);
    const px = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(px[0]).toBeGreaterThan(240);
  });

  it('wariant ze zdjęciem: strefa próbkowania nie jest biała, ton czerwono-pomarańczowy', async () => {
    const png = await renderPng(<OgloszenieCreative post={oglPost} photo={await fakePhoto()} partnerBand={false} />);
    const px = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
    expect(px[0]).toBeLessThan(235);
    expect(px[0]).toBeGreaterThan(px[1]);
    expect(px[1]).toBeGreaterThan(px[2]);
  });

  it('pas partnerów: identyczne wiersze 0–1179, różne wiersze 1230–1350', async () => {
    const off = await renderPng(<OgloszenieCreative post={oglPost} photo={null} partnerBand={false} />);
    const on = await renderPng(<OgloszenieCreative post={oglPost} photo={null} partnerBand={true} />);
    const offTop = await sharp(off).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    const onTop = await sharp(on).extract({ left: 0, top: 0, width: 1080, height: 1180 }).raw().toBuffer();
    expect(Buffer.compare(offTop, onTop)).toBe(0);
    const offBand = await sharp(off).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    const onBand = await sharp(on).extract({ left: 0, top: 1230, width: 1080, height: 120 }).raw().toBuffer();
    expect(Buffer.compare(offBand, onBand)).not.toBe(0);
  });

  it('nagłówek ma ciemne piksele (Anton)', async () => {
    const pngPhoto = await renderPng(<OgloszenieCreative post={oglPost} photo={await fakePhoto()} partnerBand={false} />);
    expect(await hasDarkPixel(pngPhoto, { left: 65, top: 600, width: 900, height: 250 })).toBe(true);
    const pngTypo = await renderPng(<OgloszenieCreative post={oglPost} photo={null} partnerBand={false} />);
    expect(await hasDarkPixel(pngTypo, { left: 65, top: 240, width: 900, height: 200 })).toBe(true);
  });

  it('nagłówek 40 znaków bez spacji (post.headline ucięty przez slice) nie wjeżdża w pas partnerów', async () => {
    const stress = { ...oglPost, headline: 'A'.repeat(60) } as unknown as Post;
    const png = await renderPng(<OgloszenieCreative post={stress} photo={null} partnerBand={true} />);
    expect(await isAllWhite(png, { left: 0, top: 1180, width: 1080, height: 50 })).toBe(true);
    expect(await isAllWhite(png, { left: 1070, top: 0, width: 10, height: 1180 })).toBe(true);
  });
});
