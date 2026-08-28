import { describe, it, expect, vi } from 'vitest';
import { processFiles, removePhoto, type PickedPhoto } from './photoProcess';

type FakeFile = { size: number; name: string };
const file = (size: number, name = 'zdjecie.jpg'): FakeFile => ({ size, name });
const makeUrl = (b: Blob) => `blob:${b.size}`;
/** Fabryka kafla — trzyma kształt `PickedPhoto` w jednym miejscu na wypadek zmiany pól. */
const pp = (key: string): PickedPhoto => ({ key, blob: new Blob([key]), url: `blob:${key}` });

describe('processFiles', () => {
  it('zatrzymuje się po osiągnięciu limitu max', async () => {
    const shrink = vi.fn(async () => new Blob(['x']));
    const { photos, errors } = await processFiles([file(10), file(10), file(10)], [], shrink, { max: 2, maxBytes: 100, makeUrl });
    expect(photos).toHaveLength(2);
    expect(errors).toEqual([]);
  });

  it('używa zmniejszonego blob po udanym shrink', async () => {
    const shrunk = new Blob(['a'.repeat(5)]);
    const shrink = vi.fn(async () => shrunk);
    const { photos } = await processFiles([file(1000)], [], shrink, { max: 10, maxBytes: 100, makeUrl });
    expect(photos[0].blob).toBe(shrunk);
    expect(photos[0].url).toBe(makeUrl(shrunk));
  });

  it('gdy shrink zawiedzie i plik mieści się w limicie — używa oryginału', async () => {
    const shrink = vi.fn(async () => {
      throw new Error('boom');
    });
    const original = file(50);
    const { photos, errors } = await processFiles([original], [], shrink, { max: 10, maxBytes: 100, makeUrl });
    expect(errors).toEqual([]);
    expect(photos).toHaveLength(1);
    expect(photos[0].blob).toBe(original as unknown as Blob);
  });

  it('gdy shrink zawiedzie i plik jest za duży — zgłasza błąd i pomija plik', async () => {
    const shrink = vi.fn(async () => {
      throw new Error('boom');
    });
    const { photos, errors } = await processFiles([file(200, 'za-duze.jpg')], [], shrink, { max: 10, maxBytes: 100, makeUrl });
    expect(photos).toHaveLength(0);
    expect(errors).toEqual(['Nie udało się przetworzyć zdjęcia (za duże): za-duze.jpg']);
  });

  it('nie przerywa reszty listy, gdy jeden plik zawiedzie i jest za duży', async () => {
    const shrink = vi.fn(async (f: FakeFile) => {
      if (f.name === 'zla.jpg') throw new Error('boom');
      return new Blob(['ok']);
    });
    const { photos, errors } = await processFiles([file(200, 'zla.jpg'), file(10, 'dobra.jpg')], [], shrink, { max: 10, maxBytes: 100, makeUrl });
    expect(photos).toHaveLength(1);
    expect(errors).toEqual(['Nie udało się przetworzyć zdjęcia (za duże): zla.jpg']);
  });

  it('klucze są unikalne', async () => {
    const shrink = vi.fn(async () => new Blob(['x']));
    const { photos } = await processFiles([file(10), file(10), file(10)], [], shrink, { max: 10, maxBytes: 100, makeUrl });
    expect(new Set(photos.map((p) => p.key)).size).toBe(3);
  });

  it('dokłada do istniejącej listy (current) i respektuje jej rozmiar w limicie max', async () => {
    const shrink = vi.fn(async () => new Blob(['x']));
    const current: PickedPhoto[] = [{ key: 'k1', blob: new Blob(['a']), url: 'blob:a' }];
    const { photos } = await processFiles([file(10), file(10)], current, shrink, { max: 2, maxBytes: 100, makeUrl });
    expect(photos).toHaveLength(2);
    expect(photos[0]).toBe(current[0]);
  });
});

describe('removePhoto', () => {
  const list = [pp('a'), pp('b'), pp('c')];

  it('usunięcie zdjęcia przed planszą przesuwa wskaźnik planszy o jeden w dół', () => {
    const r = removePhoto(list, 2, 0);
    expect(r.photos.map((p) => p.key)).toEqual(['b', 'c']);
    expect(r.hero).toBe(1);
  });

  it('usunięcie samej planszy cofa wybór na pierwsze zdjęcie', () => {
    const r = removePhoto(list, 1, 1);
    expect(r.photos.map((p) => p.key)).toEqual(['a', 'c']);
    expect(r.hero).toBe(0);
  });

  it('usunięcie zdjęcia po planszy zostawia wskaźnik planszy bez zmian', () => {
    const r = removePhoto(list, 0, 2);
    expect(r.photos.map((p) => p.key)).toEqual(['a', 'b']);
    expect(r.hero).toBe(0);
  });

  it('usunięcie ostatniego zdjęcia zeruje wskaźnik planszy', () => {
    const r = removePhoto([pp('a')], 0, 0);
    expect(r.photos).toEqual([]);
    expect(r.hero).toBe(0);
  });

  it('indeks spoza listy nie zmienia niczego', () => {
    const r = removePhoto(list, 2, 5);
    expect(r.photos).toEqual(list);
    expect(r.hero).toBe(2);
  });
});
