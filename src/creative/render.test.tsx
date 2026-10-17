import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderPng, W, H } from './render';
import { Canvas, Logo, Kicker, PartnerBand, PhotoTop, SLANT_DROP, upperPl } from './parts';

describe('renderPng', () => {
  it('renderuje 1080×1350 z Antonem i polskimi znakami, glifem tekstu i krawędzią pasa partnerów', async () => {
    const png = await renderPng(
      <Canvas>
        <Logo />
        <div style={{ position: 'absolute', left: 65, top: 400, display: 'flex', fontFamily: 'Anton', fontSize: 200 }}>{upperPl('żółć')}</div>
        <Kicker style={{ position: 'absolute', left: 65, top: 700 }}>Liga wojewódzka · młodziczki</Kicker>
        <PartnerBand />
      </Canvas>,
    );
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([W, H]);
    expect(png.length).toBeGreaterThan(20_000);
    const px = await sharp(png).extract({ left: 10, top: 1300, width: 1, height: 1 }).raw().toBuffer();
    expect(px[0]).toBeLessThan(30); // pas partnerów ciemny
    const px2 = await sharp(png).extract({ left: 10, top: 1100, width: 1, height: 1 }).raw().toBuffer();
    expect(px2[0]).toBeGreaterThan(240); // grunt biały

    // glif „ŻÓŁĆ" (Anton 200px, left:65 top:400) — szukamy choć jednego ciemnego piksela w obrębie tekstu,
    // skan prostokąta (nie pojedynczego punktu) żeby kształt liter nie robił testu kruchym
    const { data: glyphData, info: glyphInfo } = await sharp(png)
      .extract({ left: 70, top: 410, width: 580, height: 220 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let hasDarkPixel = false;
    for (let i = 0; i < glyphData.length; i += glyphInfo.channels) {
      if (glyphData[i] < 60 && glyphData[i + 1] < 60 && glyphData[i + 2] < 60) { hasDarkPixel = true; break; }
    }
    expect(hasDarkPixel).toBe(true);

    // krawędź pasa partnerów — dokładnie na y=1230 (1229 biały grunt, 1231 ciemny pas)
    const above = await sharp(png).extract({ left: 540, top: 1229, width: 1, height: 1 }).raw().toBuffer();
    expect(above[0]).toBeGreaterThan(240);
    const below = await sharp(png).extract({ left: 540, top: 1231, width: 1, height: 1 }).raw().toBuffer();
    expect(below[0]).toBeLessThan(30);
  });

  it('PhotoTop: ukos opada w lewo (DS: prawa krawędź cięta o SLANT_DROP wyżej niż lewa)', async () => {
    const darkPhoto = await sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 10, g: 10, b: 10 } } })
      .png()
      .toBuffer();
    const src = `data:image/png;base64,${darkPhoto.toString('base64')}`;
    const height = 700;
    const png = await renderPng(
      <Canvas>
        <PhotoTop src={src} height={height} />
      </Canvas>,
    );
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([W, H]);

    const firstWhiteY = async (x: number) => {
      const { data, info } = await sharp(png).extract({ left: x, top: 0, width: 1, height: H }).raw().toBuffer({ resolveWithObject: true });
      for (let y = 0; y < info.height; y++) {
        const idx = y * info.channels;
        if (data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240) return y;
      }
      return -1;
    };

    const yLeft = await firstWhiteY(2);
    const yRight = await firstWhiteY(1077);
    expect(yLeft).toBeGreaterThanOrEqual(height - 6);
    expect(yLeft).toBeLessThanOrEqual(height + 6);
    expect(yRight).toBeGreaterThanOrEqual(height - SLANT_DROP - 6);
    expect(yRight).toBeLessThanOrEqual(height - SLANT_DROP + 6);
    expect(yLeft).toBeGreaterThan(yRight); // lewa krawędź cięta niżej (później) niż prawa — ukos opada w lewo
  });
});

describe('PhotoTop — kadr', () => {
  /** Zdjęcie z dwiema połówkami w kolorach `a` i `b` (pionowo: góra/dół, poziomo: lewo/prawo). */
  const split = async (w: number, h: number, vertical: boolean) => {
    const half = { width: vertical ? w : w / 2, height: vertical ? h / 2 : h, channels: 3 as const };
    const a = await sharp({ create: { ...half, background: { r: 230, g: 20, b: 20 } } }).png().toBuffer();
    const b = await sharp({ create: { ...half, background: { r: 20, g: 20, b: 230 } } }).png().toBuffer();
    const img = await sharp({ create: { width: w, height: h, channels: 3, background: '#000' } })
      .composite([{ input: a, left: 0, top: 0 }, { input: b, left: vertical ? 0 : w / 2, top: vertical ? h / 2 : 0 }])
      .jpeg()
      .toBuffer();
    return 'data:image/jpeg;base64,' + img.toString('base64');
  };
  const pixel = async (png: Buffer, left: number, top: number) => [...(await sharp(png).extract({ left, top, width: 1, height: 1 }).raw().toBuffer())];
  const isRed = ([r, , b]: number[]) => r > 150 && b < 100;
  const isBlue = ([r, , b]: number[]) => b > 150 && r < 100;

  const size = (w: number, h: number) => ({ w, h });

  it('przesunięcie w górę/dół odsłania inną część zdjęcia, brak kadru = środek', async () => {
    const src = await split(900, 1200, true); // cover w 1080×700 → 1080×1440, granica połówek w y=720 zdjęcia
    const up = await renderPng(<Canvas><PhotoTop src={src} height={700} size={size(900, 1200)} crop={{ dx: 0, dy: 370, zoom: 100 }} /></Canvas>);
    const down = await renderPng(<Canvas><PhotoTop src={src} height={700} size={size(900, 1200)} crop={{ dx: 0, dy: -370, zoom: 100 }} /></Canvas>);
    expect(isRed(await pixel(up, 540, 400))).toBe(true); // zdjęcie zjechało w dół → widać górę (czerwoną)
    expect(isBlue(await pixel(down, 540, 400))).toBe(true);
    const legacy = await renderPng(<Canvas><PhotoTop src={src} height={700} size={size(900, 1200)} crop={{ x: 50, y: 100, zoom: 100 }} /></Canvas>);
    expect(isRed(await pixel(legacy, 540, 300))).toBe(true); // stary format kadru → środek: granica w y≈350
    expect(isBlue(await pixel(legacy, 540, 450))).toBe(true);
  });

  it('wielkość poniżej 100% zostawia ciemne tło wokół zdjęcia, a przybliżenie nie wyłazi poza pole', async () => {
    const src = await split(1600, 700, false);
    const small = await renderPng(<Canvas><PhotoTop src={src} height={700} size={size(1600, 700)} crop={{ dx: 0, dy: 0, zoom: 40 }} /></Canvas>);
    const [r, g, b] = await pixel(small, 540, 600); // poniżej pomniejszonego zdjęcia (zajmuje y 210–490), nad klinem
    expect(r + g + b).toBeLessThan(60); // tło INK, nie biel
    const big = await renderPng(<Canvas><PhotoTop src={src} height={700} size={size(1600, 700)} crop={{ dx: 800, dy: 0, zoom: 200 }} /></Canvas>);
    expect(isRed(await pixel(big, 900, 400))).toBe(true); // przesunięte w prawo → pod x=900 lewa (czerwona) połówka
    expect((await pixel(big, 540, 1000))[0]).toBeGreaterThan(240); // pod klinem nadal biały grunt
  });
});
