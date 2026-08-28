import { describe, it, expect, vi } from 'vitest';
import { processFiles, removePhoto, type PickedPhoto } from './photoProcess';

type FakeFile = { size: number; name: string };
const file = (size: number, name = 'zdjecie.jpg'): FakeFile => ({ size, name });
const makeUrl = (b: Blob) => `blob:${b.size}`;
/** Fabryka kafla — trzyma kształt `PickedPhoto` w jednym miejscu na wypadek zmiany pól. */
const pp = (key: string): PickedPhoto => ({ key, blob: new Blob([key]), url: `blob:${key}`, preview: true });

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

  it('gdy shrink zawiedzie i plik mieści się w limicie — używa oryginału, ale ostrzega i oznacza brak podglądu', async () => {
    const shrink = vi.fn(async () => {
      throw new Error('boom');
    });
    const original = file(50, 'moze-heic.jpg');
    const { photos, errors } = await processFiles([original], [], shrink, { max: 10, maxBytes: 100, makeUrl });
    // Plik zostaje (HEIC z iPhone'a serwer potrafi przyjąć), ale trener musi wiedzieć, że podglądu nie ma —
    // bez tego plik tekstowy nazwany .jpg wyglądał jak puste zdjęcie i wywracał generację (UAT D-01).
    expect(errors).toEqual(['Nie udało się podejrzeć zdjęcia moze-heic.jpg — jeśli to nie jest zdjęcie, usuń je']);
    expect(photos).toHaveLength(1);
    expect(photos[0].blob).toBe(original as unknown as Blob);
    expect(photos[0].preview).toBe(false);
  });

  it('po udanym shrink kafel ma podgląd', async () => {
    const shrink = vi.fn(async () => new Blob(['x']));
    const { photos } = await processFiles([file(10)], [], shrink, { max: 10, maxBytes: 100, makeUrl });
    expect(photos[0].preview).toBe(true);
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
    const current: PickedPhoto[] = [pp('k1')];
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
