import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { renderCreative } from './index';
import { log } from '@/lib/log';
import type { Post } from '@/domain/types';

const post = {
  id: '1',
  type: 'mecz',
  kicker: 'k',
  headline: '3 : 2',
  form: { team: null, opponent: 'X', scoreHome: 3, scoreAway: 2, venue: 'dom', venueCity: null, notes: null },
} as unknown as Post;

describe('renderCreative', () => {
  it('bez zdjęcia', async () => {
    const png = await renderCreative(post, null, { partnerBand: false });
    expect((await sharp(png).metadata()).width).toBe(1080);
  });

  it('zepsute zdjęcie → fallback typograficzny zamiast błędu, log.warn zamiast wyjątku', async () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const png = await renderCreative(post, Buffer.from('to nie jest obraz'), { partnerBand: false });
    expect((await sharp(png).metadata()).height).toBe(1350);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
