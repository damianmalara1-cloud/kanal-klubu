import sharp from 'sharp';

/** Pomarańczowe zdjęcie 1200×900 jako data URI — fixture do testów szablonów. Celowo NIE plik *.test.ts: import z pliku testowego uruchamiałby jego suite ponownie. */
export const fakePhoto = async () =>
  'data:image/jpeg;base64,' +
  (
    await sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 200, g: 120, b: 60 } } })
      .jpeg()
      .toBuffer()
  ).toString('base64');
