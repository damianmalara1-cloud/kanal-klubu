import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderPng } from '../render';
import { OgloszenieCreative } from './ogloszenie';
import { fakePhoto } from '../testUtils';
import type { Post } from '@/domain/types';

const post = (over: { headline?: string | null; title?: string } = {}) =>
  ({
    id: '1',
    type: 'ogloszenie',
    kicker: 'Nabór 2026/27',
    headline: over.headline === undefined ? 'ZACZNIJ GRAĆ W BANINIE' : over.headline,
    form: {
      title: over.title ?? 'Nabór',
      body: 'Zapraszamy dzieci i młodzież na treningi piłki ręcznej w Baninie.',
      team: null,
      date: 'wtorki i czwartki',
      time: '17:00 – 18:30',
      place: 'hala SP2 Banino',
    },
  }) as unknown as Post;

describe('OgloszenieCreative', () => {
  it('oba warianty renderują 1080×1350', async () => {
    for (const photo of [null, await fakePhoto()]) {
      const png = await renderPng(<OgloszenieCreative post={post()} photo={photo} partnerBand={false} />);
      const meta = await sharp(png).metadata();
      expect(meta.width).toBe(1080);
      expect(meta.height).toBe(1350);
    }
  });

  // UAT D-10: na planszy ogłoszenia widniał nagłówek wymyślony przez model, a nie tytuł wpisany przez
  // trenera („Nabór" → „ZACZNIJ GRAĆ W BANINIE"). Przy ogłoszeniu źródłem prawdy jest formularz —
  // `post.headline` jest dla tego typu ignorowany, choć model nadal go zwraca.
  it('nagłówek bierze się z pola „Tytuł", a nie z headline od AI', async () => {
    const zAi = await renderPng(<OgloszenieCreative post={post({ headline: 'ZUPEŁNIE INNY NAGŁÓWEK' })} photo={null} partnerBand={false} />);
    const bezAi = await renderPng(<OgloszenieCreative post={post({ headline: null })} photo={null} partnerBand={false} />);
    expect(Buffer.compare(zAi, bezAi)).toBe(0);
  });

  it('zmiana tytułu w formularzu zmienia planszę (tytuł faktycznie jest renderowany)', async () => {
    const nabor = await renderPng(<OgloszenieCreative post={post({ title: 'Nabór' })} photo={null} partnerBand={false} />);
    const zebranie = await renderPng(<OgloszenieCreative post={post({ title: 'Zebranie rodziców' })} photo={null} partnerBand={false} />);
    expect(Buffer.compare(nabor, zebranie)).not.toBe(0);
  });
});
