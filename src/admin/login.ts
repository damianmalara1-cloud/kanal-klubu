import { getConfig } from '@/config';
import { getEvents, recordEvent } from '@/events';
import { nowIso } from '@/lib/dates';
import { errMessage } from '@/lib/errors';
import { log } from '@/lib/log';
import { safeEqual } from '@/lib/secret';
import { adminEnabled } from './session';

export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MIN = 15;
export type LoginResult = 'ok' | 'bad' | 'limit' | 'error' | 'disabled';

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  bad: 'Złe hasło',
  limit: 'Za dużo prób, spróbuj za 15 minut',
  error: 'Nie udało się sprawdzić logowania, spróbuj za chwilę',
};

/** Komunikat błędu logowania z kodu w `?e=` (strona niezalogowana — musi przeżyć dowolny wejściowy string).
 * `Object.hasOwn` zamiast `MSG[code]`/`code in MSG`: `?e=__proto__`/`?e=constructor`/`?e=toString` trafiają
 * w klucze prototypu zwykłego obiektu i zwracają obiekt/funkcję zamiast `undefined`, co wywala render Reacta. */
export function loginErrorMessage(code: string | undefined): string | undefined {
  if (!code || !Object.hasOwn(LOGIN_ERROR_MESSAGES, code)) return undefined;
  return LOGIN_ERROR_MESSAGES[code];
}

/** Logowanie admina bez warstwy Next (ciasteczko i redirect robi server action). Limit prób liczony PRZED sprawdzeniem
 * hasła i fail closed: gdy dziennik nie odpowiada, nie wpuszczamy — bez niego limit nie działa (spec §7). */
export async function checkLogin(password: string, ip: string, now: string = nowIso()): Promise<LoginResult> {
  const c = getConfig();
  if (!adminEnabled(c.adminPassword)) return 'disabled';
  let fails: number;
  try {
    fails = await getEvents().countSince('admin_login_failed', new Date(Date.parse(now) - LOGIN_WINDOW_MIN * 60_000).toISOString(), ip);
  } catch (e) {
    log.error('admin-login', { err: errMessage(e) });
    return 'error';
  }
  if (fails >= LOGIN_MAX_FAILS) return 'limit';
  if (!safeEqual(password, c.adminPassword)) {
    await recordEvent({ type: 'admin_login_failed', meta: { ip }, at: now });
    return 'bad';
  }
  await recordEvent({ type: 'admin_login', at: now });
  return 'ok';
}
