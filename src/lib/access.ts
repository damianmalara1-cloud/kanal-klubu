import { getConfig } from '@/config';
import { safeEqual } from './secret';

/** Sekret trenera z linku (`?secret=`) porównany stałoczasowo z `COACH_LINK_SECRET` — brama do `/api/download`. */
export const isValidSecret = (secret: string): boolean => !!secret && safeEqual(secret, getConfig().coachLinkSecret);

/** Pierwszy adres z `X-Forwarded-For` (klient za proxy Vercela) — do limitów per-IP (Task 15). `null` gdy nagłówka brak. */
export const clientIp = (h: Headers): string | null => h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
