import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Config } from '@/config';

vi.mock('@/config', () => ({
  getConfig: vi.fn(() => ({ aiMock: false, openrouterApiKey: 'k', appUrl: 'https://u', aiModel: 'm' })),
}));

import { getConfig } from '@/config';
import { log } from '@/lib/log';
import { AppError } from '@/lib/errors';
import { callModel } from './client';

// Ścieżka nie-2xx w client.ts realnie loguje log.error (produkcyjnie pożądane) — tłumimy tu, żeby output testów był czysty.
beforeEach(() => {
  vi.spyOn(log, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('callModel', () => {
  it('wysyła poprawny request do OpenRouter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ODPOWIEDŹ' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await callModel('SYS', 'USR');

    expect(text).toBe('ODPOWIEDŹ');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.method).toBe('POST');

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer k');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['HTTP-Referer']).toBe('https://u');
    expect(headers['X-Title']).toBeTruthy();

    const body = JSON.parse(init.body as string) as { model: string; messages: { role: string; content: string }[] };
    expect(body.model).toBe('m');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYS' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'USR' });
    expect(JSON.stringify(body)).not.toMatch(/data:image|base64/);

    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('rzuca błąd ze statusem i treścią odpowiedzi przy nie-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: () => 'rate limited' }));
    await expect(callModel('s', 'u')).rejects.toThrow(/429/);
  });

  it('komunikat błędu przy nie-2xx zawiera treść odpowiedzi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: () => 'rate limited' }));
    await expect(callModel('s', 'u')).rejects.toThrow(/rate limited/);
  });

  it('402 (brak środków na OpenRouterze) → czytelny komunikat po polsku, bez ponowienia', async () => {
    // 402 nie mija samo — ponawianie tylko przedłuża czekanie trenera. Komunikat ma mu powiedzieć,
    // że to nie jego wina i kto ma to odblokować.
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 402, text: () => 'insufficient credits' });
    vi.stubGlobal('fetch', fetchMock);
    await expect(callModel('s', 'u')).rejects.toThrow(/Skończył się budżet AI/);
    await expect(callModel('s', 'u')).rejects.toBeInstanceOf(AppError);
    await expect(callModel('s', 'u')).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // 3 wywołania testu = 3 requesty, czyli ani jednego retry
  });

  it('rzuca przy pustej odpowiedzi modelu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => ({ choices: [] }) }));
    await expect(callModel('s', 'u')).rejects.toThrow(/pusta odpowiedź/);
  });

  it('tryb mock: nie woła fetch, zwraca deterministyczny tekst', async () => {
    vi.mocked(getConfig).mockReturnValueOnce({ aiMock: true, openrouterApiKey: 'k', appUrl: 'https://u', aiModel: 'm' } as unknown as Config);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const text = await callModel('s', 'u');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(text).toContain('24 : 18');
    expect(text).toContain('8');
  });

  it('przerywa sygnał po przekroczeniu domyślnego timeoutu', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => new Promise<never>(() => {}));
    vi.stubGlobal('fetch', fetchMock);

    void callModel('s', 'u');
    await vi.advanceTimersByTimeAsync(0);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const signal = init.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(signal.aborted).toBe(true);
  });

  it('czyści timer po udanym wywołaniu', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'X' } }] }) }));

    await callModel('s', 'u');

    expect(vi.getTimerCount()).toBe(0);
  });
});
