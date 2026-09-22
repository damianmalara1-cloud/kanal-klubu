import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConfig } from '@/test/helpers';

const cfg = vi.hoisted(() => ({ mockExternal: false }));
vi.mock('@/config', () => ({ getConfig: () => testConfig({ mockExternal: cfg.mockExternal }) }));

/** Cache kursu żyje na poziomie modułu (Fix 1) — każdy test dostaje świeżą instancję `./nbp` (i `./log`, żeby
 * spy trafiał w tę samą instancję, której `nbp.ts` faktycznie używa) przez `resetModules` + dynamiczny import,
 * zamiast dzielić stan cache między testami. */
async function freshNbp() {
  vi.resetModules();
  const [nbp, logMod] = await Promise.all([import('./nbp'), import('./log')]);
  return { usdPln: nbp.usdPln, log: logMod.log };
}

beforeEach(() => { cfg.mockExternal = false; });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('usdPln', () => {
  it('średni kurs z tabeli A NBP', async () => {
    const { usdPln } = await freshNbp();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: [{ mid: 3.7123 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await usdPln()).toBe(3.7123);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
  });

  it('błąd HTTP → null + log.warn ze statusem', async () => {
    const { usdPln, log } = await freshNbp();
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    expect(await usdPln()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('nbp', expect.objectContaining({ status: 500 }));
  });

  it('zła treść odpowiedzi (brak kursu) → null + log.warn', async () => {
    const { usdPln, log } = await freshNbp();
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: [] }) }));
    expect(await usdPln()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('nbp', expect.anything());
  });

  it('wyjątek (np. timeout) → null + log.warn', async () => {
    const { usdPln, log } = await freshNbp();
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await usdPln()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('nbp', { err: 'timeout' });
  });

  it('tryb mock → null bez wychodzenia do sieci i bez dotykania cache', async () => {
    cfg.mockExternal = true;
    const { usdPln } = await freshNbp();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await usdPln()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drugie wywołanie w ciągu 24h NIE odpytuje NBP ponownie (cache sukcesu)', async () => {
    const { usdPln } = await freshNbp();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: [{ mid: 3.7123 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await usdPln()).toBe(3.7123);
    expect(await usdPln()).toBe(3.7123);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('po 24h kurs jest pobierany ponownie', async () => {
    vi.useFakeTimers();
    const { usdPln } = await freshNbp();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: [{ mid: 3.7123 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await usdPln()).toBe(3.7123);
    vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000 + 1_000);
    expect(await usdPln()).toBe(3.7123);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('porażka jest ponawiana dopiero po 15 minutach', async () => {
    vi.useFakeTimers();
    const { usdPln, log } = await freshNbp();
    vi.spyOn(log, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await usdPln()).toBeNull();
    expect(await usdPln()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 15 * 60 * 1000 + 1_000);
    expect(await usdPln()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
