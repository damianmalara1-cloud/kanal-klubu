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
