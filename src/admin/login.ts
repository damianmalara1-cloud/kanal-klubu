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
