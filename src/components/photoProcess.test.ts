import { describe, it, expect, vi } from 'vitest';
import { processFiles, type PickedPhoto } from './photoProcess';

type FakeFile = { size: number; name: string };
const file = (size: number, name = 'zdjecie.jpg'): FakeFile => ({ size, name });
const makeUrl = (b: Blob) => `blob:${b.size}`;

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
