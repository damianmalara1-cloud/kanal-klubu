import { describe, it, expect } from 'vitest';
import { asset, assetDataUri } from './assets';

describe('assets', () => {
  it('zwraca font Anton jako Buffer TTF', () => {
    const buf = asset('fonts/Anton-Regular.ttf');
    expect(buf.length).toBeGreaterThan(100_000);
    expect(buf.subarray(0, 4).toString('hex')).toBe('00010000'); // nagłówek TrueType
  });
  it('zwraca logo jako data URI svg', () => {
    const uri = assetDataUri('logo/uks-banino-crest.svg');
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });
  it('zwraca png partnerów', () => {
    expect(assetDataUri('partnerzy/klub-pro-white.png').startsWith('data:image/png;base64,')).toBe(true);
  });
});
