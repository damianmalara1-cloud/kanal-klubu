import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
const cfg = vi.hoisted(() => ({ adminPassword: 'haslo-admina-123' }));
vi.mock('@/config', () => ({ getConfig: () => testConfig({ adminPassword: cfg.adminPassword }) }));
import { checkLogin, loginErrorMessage, LOGIN_MAX_FAILS } from './login';
import { getEvents } from '@/events';
import { log } from '@/lib/log';

const PW = 'haslo-admina-123';
const NOW = '2026-09-22T12:00:00.000Z';
const ALL: [string, string] = ['2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'];

beforeEach(() => { resetAdapters(); cfg.adminPassword = PW; });
afterEach(() => vi.restoreAllMocks());

describe('checkLogin', () => {
  it('dobre hasło → ok + zdarzenie admin_login (bez IP)', async () => {
    expect(await checkLogin(PW, '1.1.1.1', NOW)).toBe('ok');
    const [e] = await getEvents().listRange(...ALL);
    expect(e).toMatchObject({ type: 'admin_login', author: null, meta: {} });
  });

  it('złe hasło → bad + admin_login_failed z IP', async () => {
    expect(await checkLogin('zle-haslo-zle', '1.1.1.1', NOW)).toBe('bad');
    const [e] = await getEvents().listRange(...ALL);
    expect(e).toMatchObject({ type: 'admin_login_failed', meta: { ip: '1.1.1.1' } });
  });

  it(`${LOGIN_MAX_FAILS} błędów w 15 min z jednego IP → limit nawet przy dobrym haśle; inne IP dalej może`, async () => {
    for (let i = 0; i < LOGIN_MAX_FAILS; i++) await checkLogin('zle-haslo-zle', '1.1.1.1', NOW);
    expect(await checkLogin(PW, '1.1.1.1', NOW)).toBe('limit');
    expect(await checkLogin(PW, '2.2.2.2', NOW)).toBe('ok');
  });

  it('błędy starsze niż 15 min nie blokują', async () => {
    for (let i = 0; i < LOGIN_MAX_FAILS; i++) await checkLogin('zle-haslo-zle', '1.1.1.1', '2026-09-22T11:40:00.000Z');
    expect(await checkLogin(PW, '1.1.1.1', NOW)).toBe('ok');
  });

  it('dziennik nie odpowiada → error (fail closed), błąd zalogowany', async () => {
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.spyOn(getEvents(), 'countSince').mockRejectedValueOnce(new Error('db down'));
    expect(await checkLogin(PW, '1.1.1.1', NOW)).toBe('error');
    expect(errSpy).toHaveBeenCalledWith('admin-login', { err: 'db down' });
  });

  it('panel wyłączony (krótkie hasło w konfiguracji) → disabled, nic nie zapisuje', async () => {
    cfg.adminPassword = 'krotkie';
    expect(await checkLogin('krotkie', '1.1.1.1', NOW)).toBe('disabled');
    expect(await getEvents().listRange(...ALL)).toEqual([]);
  });
});

describe('loginErrorMessage', () => {
  it('mapuje znane kody na polskie komunikaty', () => {
    expect(loginErrorMessage('bad')).toBe('Złe hasło');
    expect(loginErrorMessage('limit')).toBe('Za dużo prób, spróbuj za 15 minut');
    expect(loginErrorMessage('error')).toBe('Nie udało się sprawdzić logowania, spróbuj za chwilę');
  });

  it('nieznane / puste / prototypowe klucze → undefined (Object.hasOwn, nie `in`)', () => {
    expect(loginErrorMessage(undefined)).toBeUndefined();
    expect(loginErrorMessage('')).toBeUndefined();
    expect(loginErrorMessage('__proto__')).toBeUndefined();
    expect(loginErrorMessage('constructor')).toBeUndefined();
    expect(loginErrorMessage('toString')).toBeUndefined();
    expect(loginErrorMessage('xyz')).toBeUndefined();
  });
});
