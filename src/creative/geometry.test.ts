import { describe, it, expect } from 'vitest';
import { normalizeCrop } from '@/domain/types';
import { photoHeight, photoRect } from './geometry';

describe('photoRect — kadr jak w generatorze KPR (cover wyśrodkowany × wielkość + przesunięcie px)', () => {
  it('domyślnie: pionowe zdjęcie wypełnia szerokość, nadmiar po równo w górę i w dół', () => {
    expect(photoRect(900, 1200, 700, { dx: 0, dy: 0, zoom: 100 })).toEqual({ left: 0, top: -370, width: 1080, height: 1440 });
  });
  it('przesunięcie działa w obie osie także bez powiększenia (wcześniej oś bez nadmiaru stała w miejscu)', () => {
    const r = photoRect(1600, 1200, 700, { dx: 120, dy: -40, zoom: 100 });
    expect([r.left, r.top]).toEqual([120, -95]); // 1600×1200 → cover 1080×810, środek −55, −40 w górę
  });
  it('wielkość skaluje wokół środka pola, także poniżej 100%', () => {
    expect(photoRect(1080, 700, 700, { dx: 0, dy: 0, zoom: 50 })).toEqual({ left: 270, top: 175, width: 540, height: 350 });
    expect(photoRect(1080, 700, 700, { dx: 0, dy: 0, zoom: 200 })).toEqual({ left: -540, top: -350, width: 2160, height: 1400 });
  });
  it('wysokość pola per szablon', () => {
    expect([photoHeight('mecz', false), photoHeight('turniej', false), photoHeight('sukces', true), photoHeight('ogloszenie', true), photoHeight('ogloszenie', false)]).toEqual([700, 600, 770, 600, 700]);
  });
});

describe('normalizeCrop', () => {
  it('null i stary format {x, y, zoom} sprzed suwaków → domyślny kadr', () => {
    expect(normalizeCrop(null)).toEqual({ dx: 0, dy: 0, zoom: 100 });
    expect(normalizeCrop({ x: 100, y: 100, zoom: 100 })).toEqual({ dx: 0, dy: 0, zoom: 100 });
    expect(normalizeCrop({ dx: -30, dy: 15, zoom: 140 })).toEqual({ dx: -30, dy: 15, zoom: 140 });
  });
});
