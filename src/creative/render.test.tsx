import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderPng, W, H } from './render';
import { Canvas, Logo, Kicker, PartnerBand, upperPl } from './parts';

describe('renderPng', () => {
  it('renderuje 1080×1350 z Antonem i polskimi znakami', async () => {
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
  });
});
