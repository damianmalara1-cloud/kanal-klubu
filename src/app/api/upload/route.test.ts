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
});
