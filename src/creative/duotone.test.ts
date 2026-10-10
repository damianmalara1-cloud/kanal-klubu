import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { duotone, originalPhoto } from './duotone';

describe('duotone', () => {
  it('zamienia pomarańcz hali na skalę czerń→czerwień i zmniejsza', async () => {
    const src = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 220, g: 140, b: 60 } } }).jpeg().toBuffer();
    const out = await duotone(src);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1400); expect(meta.format).toBe('jpeg');
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const [r, g, b] = [data[0], data[1], data[2]];
    expect(r).toBeGreaterThan(g); expect(g).toBeLessThan(90); expect(b).toBeLessThan(90); // czerwony odcień, nie pomarańcz
  });

  it('originalPhoto zostawia kolory z aparatu (pomarańcz zostaje pomarańczem) i zmniejsza', async () => {
    const src = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 220, g: 140, b: 60 } } }).jpeg().toBuffer();
    const out = await originalPhoto(src);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1400); expect(meta.format).toBe('jpeg');
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    expect(Math.abs(data[0] - 220)).toBeLessThan(6); expect(Math.abs(data[1] - 140)).toBeLessThan(6); expect(Math.abs(data[2] - 60)).toBeLessThan(6);
  });
});
