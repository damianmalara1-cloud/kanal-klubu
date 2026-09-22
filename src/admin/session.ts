import { createHmac } from 'node:crypto';
import { safeEqual } from '@/lib/secret';

export const ADMIN_COOKIE = 'kk_admin';
export const SESSION_DAYS = 30;
export const MIN_ADMIN_PASSWORD = 12;
const DAY_MS = 86_400_000;

/** Panel działa tylko przy haśle ≥ 12 znaków — pusty/krótki `ADMIN_PASSWORD` = panel wyłączony (fail closed, spec §7). */
export const adminEnabled = (pw: string): boolean => pw.length >= MIN_ADMIN_PASSWORD;

/** HMAC kluczowany samym hasłem: zmiana `ADMIN_PASSWORD` w Vercelu unieważnia wszystkie wydane sesje. */
const sign = (pw: string, exp: number) => createHmac('sha256', pw).update(`kk-admin:${exp}`).digest('base64url');

export function makeSession(pw: string, nowMs: number = Date.now()): { value: string; maxAge: number } {
  const exp = nowMs + SESSION_DAYS * DAY_MS;
  return { value: `${exp}.${sign(pw, exp)}`, maxAge: SESSION_DAYS * 86_400 };
}

export function verifySession(pw: string, value: string | undefined, nowMs: number = Date.now()): boolean {
  if (!adminEnabled(pw) || !value) return false;
  const m = /^(\d{10,16})\.([A-Za-z0-9_-]{43})$/.exec(value); // SHA-256 w base64url = 43 znaki
  if (!m) return false;
  const exp = Number(m[1]);
  if (!(exp > nowMs)) return false;
  return safeEqual(m[2], sign(pw, exp));
}
