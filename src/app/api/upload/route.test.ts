import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachLinkSecret: 'abcdefghijklmnop', coachNames: ['Ania'] }) }));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));

const attachPhotoSpy = vi.hoisted(() => vi.fn());
vi.mock('@/workflow/draft', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/workflow/draft')>();
  attachPhotoSpy.mockImplementation(actual.attachPhoto);
  return { ...actual, attachPhoto: attachPhotoSpy };
});

import sharp from 'sharp';
import { POST } from './route';
import { createDraft, MAX_UPLOAD_BYTES } from '@/workflow/draft';
import { log } from '@/lib/log';

const S = 'abcdefghijklmnop';
beforeEach(() => {
  resetAdapters();
  attachPhotoSpy.mockClear();
});

describe('POST /api/upload', () => {
  it('zły sekret → 404, attachPhoto nie wywołane', async () => {
    const r = await POST(new Request('http://x/api/upload?secret=zly&id=abc', { method: 'POST' }));
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'Nieprawidłowy link' });
    expect(attachPhotoSpy).not.toHaveBeenCalled();
  });

  it('Content-Length za duży → 413 bez buforowania body (attachPhoto nie wywołane)', async () => {
    const r = await POST(
      new Request(`http://x/api/upload?secret=${S}&id=abc`, {
        method: 'POST',
        headers: { 'content-length': '10000000' },
        body: new Uint8Array(10),
      }),
    );
    expect(r.status).toBe(413);
    expect(await r.json()).toEqual({ error: 'Zdjęcie jest za duże (max 4 MB)' });
    expect(attachPhotoSpy).not.toHaveBeenCalled();
  });

  it('poprawny upload multipart → { path }', async () => {
    const d = await createDraft({
      author: 'Ania',
      type: 'ogloszenie',
      ip: null,
      form: { title: 'Nabór', body: 'Zapraszamy na treningi w środy.' },
    });
    const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#333' } }).jpeg().toBuffer();
    const fd = new FormData();
    fd.append('file', new File([bytes], 'zdjecie.jpg', { type: 'image/jpeg' }));
    const r = await POST(new Request(`http://x/api/upload?secret=${S}&id=${d.id}`, { method: 'POST', body: fd }));
    expect(r.status).toBe(200);
    const body = (await r.json()) as { path: string };
    expect(typeof body.path).toBe('string');
    expect(attachPhotoSpy).toHaveBeenCalledTimes(1);
    expect(bytes.length).toBeLessThan(MAX_UPLOAD_BYTES);
  });

  // R-02: przerwana wysyłka (odświeżenie strony, blokada ekranu) szła do logu jako `error`, choć nie
  // ma tam nic do naprawienia — i tak zagłuszała realne awarie uploadu.
  it('przerwane body → warn, nie error (i bez wywołania attachPhoto)', async () => {
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const body = new ReadableStream({ start: (c) => c.error(new Error('połączenie zerwane')) });
    const r = await POST(
      new Request(`http://x/api/upload?secret=${S}&id=abc`, {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=xyz' },
        body,
        // @ts-expect-error `duplex` jest wymagane dla body-strumienia, ale nie ma go w typach DOM-owych
        duplex: 'half',
      }),
    );
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'Wysyłanie zdjęcia zostało przerwane' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
    expect(attachPhotoSpy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
