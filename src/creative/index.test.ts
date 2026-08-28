import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import sharp from 'sharp';
import { log } from '@/lib/log';
import type { Post } from '@/domain/types';
import { renderCreative } from './index';

// `post.type` we wszystkich testach to zawsze 'mecz' — mockujemy WYŁĄCZNIE ten szablon, żeby kontrolować
// dokładnie kiedy render "ze zdjęciem" ma się udać, a kiedy rzucić, bez dotykania prawdziwego renderu
// satori/fontów. `vi.mock` (i `vi.hoisted`, żeby dobrać się do `meczMock` z ciał testów) są przez vitest
// podnoszone ponad importy niezależnie od pozycji w źródle, więc kolejność poniżej nie ma znaczenia.
const { meczMock } = vi.hoisted(() => ({ meczMock: vi.fn() }));
vi.mock('./templates/mecz', () => ({ MeczCreative: meczMock }));

const post = {
  id: '1',
  type: 'mecz',
  kicker: 'k',
  headline: '3 : 2',
  form: { team: null, opponent: 'X', scoreHome: 3, scoreAway: 2, venue: 'dom', venueCity: null, notes: null },
} as unknown as Post;

/** Domyślna atrapa szablonu: biały div bez zdjęcia, ciemnoczerwony div ze zdjęciem — wystarczy, żeby
 * sonda w strefie zdjęcia (540, 200) odróżniła wariant typograficzny od wariantu ze zdjęciem. */
function defaultMeczImpl({ photo }: { photo: string | null }) {
  return createElement('div', {
    style: { width: 1080, height: 1350, display: 'flex', background: photo ? '#7a1f1f' : '#ffffff' },
  });
}

async function validPhotoBuffer(): Promise<Buffer> {
  return sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 100, b: 50 } } })
    .jpeg()
    .toBuffer();
}

async function probeIsWhite(png: Buffer): Promise<boolean> {
  const px = await sharp(png).extract({ left: 540, top: 200, width: 1, height: 1 }).raw().toBuffer();
  return px[0] > 240;
}

beforeEach(() => {
  meczMock.mockReset();
  meczMock.mockImplementation(defaultMeczImpl);
});

describe('renderCreative', () => {
  it('bez zdjęcia — renderuje wariant typograficzny (Template wywołany z photo: null)', async () => {
    const png = await renderCreative(post, null, { partnerBand: false });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1350);
    expect(await probeIsWhite(png)).toBe(true);
  });

  it('zepsute zdjęcie (duotone rzuca) → fallback na wariant typograficzny, log.warn z komunikatem o duotone', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const png = await renderCreative(post, Buffer.from('to nie jest obraz'), { partnerBand: false });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1350);
    expect(await probeIsWhite(png)).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('duotone'), expect.anything());
    warn.mockRestore();
  });

  it('zdjęcie poprawne, ale render wariantu ze zdjęciem rzuca → fallback na typograficzny, log.warn z komunikatem o renderze', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    meczMock.mockImplementation(({ photo }: { photo: string | null }) => {
      if (photo !== null) throw new Error('symulowany błąd renderu ze zdjęciem');
      return defaultMeczImpl({ photo });
    });
    const png = await renderCreative(post, await validPhotoBuffer(), { partnerBand: false });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1350);
    expect(await probeIsWhite(png)).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('render ze zdjęciem'), expect.anything());
    warn.mockRestore();
  });

  it('gdy nawet wariant typograficzny rzuca, błąd propaguje się (nie jest połykany)', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    meczMock.mockImplementation(() => {
      throw new Error('boom — nawet wariant typograficzny padł');
    });
    await expect(renderCreative(post, await validPhotoBuffer(), { partnerBand: false })).rejects.toThrow(
      'boom — nawet wariant typograficzny padł',
    );
    warn.mockRestore();
  });
});
