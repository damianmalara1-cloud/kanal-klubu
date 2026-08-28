import sharp from 'sharp';
import { MAX_INPUT_PIXELS } from '@/domain/limits';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export interface DuotoneOpts {
  shadow?: string;
  highlight?: string;
  maxSide?: number;
  contrast?: number;
}

/** Wypala zdjęcie w duotone klubu (czerń → czerwień) i zmniejsza do maxSide px, JPEG. */
export async function duotone(input: Buffer, opts: DuotoneOpts = {}): Promise<Buffer> {
  const { shadow = '#0D0D0D', highlight = '#D9382E', maxSide = 1400, contrast = 1.06 } = opts;
  const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const s = hex(shadow), h = hex(highlight), ch = info.channels;
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0, j = 0; i < data.length; i += ch, j += 3) {
    const t = Math.min(1, Math.max(0, (data[i] / 255 - 0.5) * contrast + 0.5));
    out[j] = Math.round(s[0] + (h[0] - s[0]) * t);
    out[j + 1] = Math.round(s[1] + (h[1] - s[1]) * t);
    out[j + 2] = Math.round(s[2] + (h[2] - s[2]) * t);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).jpeg({ quality: 88 }).toBuffer();
}
