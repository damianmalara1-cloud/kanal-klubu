import { describe, it, expect, vi, afterEach } from 'vitest';
import { testConfig } from '@/test/helpers';
const cfg = vi.hoisted(() => ({ mockExternal: false }));
vi.mock('@/config', () => ({ getConfig: () => testConfig({ mockExternal: cfg.mockExternal }) }));
import { usdPln } from './nbp';
import { log } from './log';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); cfg.mockExternal = false; });

describe('usdPln', () => {
  it('średni kurs z tabeli A NBP', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: [{ mid: 3.7123 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await usdPln()).toBe(3.7123);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
  });

  it('błąd HTTP / zła treść / wyjątek → null (panel pokaże samo USD)', async () => {
    vi.spyOn(log, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await usdPln()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: [] }) }));
    expect(await usdPln()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await usdPln()).toBeNull();
  });

  it('tryb mock → null bez wychodzenia do sieci', async () => {
    cfg.mockExternal = true;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await usdPln()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
