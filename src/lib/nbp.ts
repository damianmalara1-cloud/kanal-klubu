import { getConfig } from '@/config';
import { errMessage } from './errors';
import { log } from './log';

const NBP_URL = 'https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json';
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000; // 24 h (spec §8.1)
const FAILURE_TTL_MS = 15 * 60 * 1000; // porażka NBP nie może dokładać 3 s czekania do KAŻDEGO ładowania pulpitu

let cache: { value: number | null; expiresAt: number } | null = null;

/** Średni kurs USD/PLN z tabeli A NBP. Cache modułowy: sukces 24 h, porażka 15 min (spec §8.1) — zastępuje
 * `next: { revalidate }`, martwe pod `export const dynamic = 'force-dynamic'` na `/admin` (Next 16 wymusza
 * wtedy `fetchCache = 'force-no-store'`, więc każdy load pulpitu bił NBP na żywo). Każda porażka → null: panel
 * pokazuje wtedy samo USD, bez zmyślonego kursu z kodu. W trybie mock nie wychodzimy do sieci i nie dotykamy
 * cache (testy i e2e mają być deterministyczne). */
export async function usdPln(): Promise<number | null> {
  if (getConfig().mockExternal) return null;
  if (cache && Date.now() < cache.expiresAt) return cache.value;
  const value = await fetchRate();
  cache = { value, expiresAt: Date.now() + (value === null ? FAILURE_TTL_MS : SUCCESS_TTL_MS) };
  return value;
}

async function fetchRate(): Promise<number | null> {
  try {
    const res = await fetch(NBP_URL, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) {
      log.warn('nbp', { status: res.status });
      return null;
    }
    const mid = ((await res.json()) as { rates?: { mid?: unknown }[] }).rates?.[0]?.mid;
    if (typeof mid === 'number' && mid > 0) return mid;
    log.warn('nbp', { mid });
    return null;
  } catch (e) {
    log.warn('nbp', { err: errMessage(e) });
    return null;
  }
}
