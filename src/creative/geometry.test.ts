import { describe, it, expect } from 'vitest';
import { photoHeight, photoRect } from './geometry';

describe('photoRect — ta sama arytmetyka co PhotoTop (cover + object-position + zoom)', () => {
  it('bez przybliżenia, środek: pionowe zdjęcie wypełnia szerokość, nadmiar po równo w górę i w dół', () => {
    expect(photoRect(900, 1200, 700, { x: 50, y: 50, zoom: 100 })).toEqual({ left: 0, top: -370, width: 1080, height: 1440 });
  });
  it('y=0 przykleja górę zdjęcia, y=100 dół', () => {
    expect(photoRect(900, 1200, 700, { x: 50, y: 0, zoom: 100 }).top + 0).toBe(0);
    expect(photoRect(900, 1200, 700, { x: 50, y: 100, zoom: 100 }).top).toBe(-740);
  });
  it('zoom 200 przy x=0 — punkt 900 px planszy trafia w 450 px zdjęcia (jak w teście renderu)', () => {
    const r = photoRect(1600, 700, 700, { x: 0, y: 50, zoom: 200 });
    expect([r.left + 0, r.width, r.height]).toEqual([0, 3200, 1400]);
    expect((900 - r.left) / (r.width / 1600)).toBe(450);
  });
  it('wysokość pola per szablon', () => {
    expect([photoHeight('mecz', false), photoHeight('turniej', false), photoHeight('sukces', true), photoHeight('ogloszenie', true), photoHeight('ogloszenie', false)]).toEqual([700, 600, 770, 600, 700]);
  });
});
