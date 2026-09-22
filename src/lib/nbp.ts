import { getConfig } from '@/config';
import { errMessage } from './errors';
import { log } from './log';

const NBP_URL = 'https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json';

/** Średni kurs USD/PLN z tabeli A NBP, cache 24 h (spec §8.1). Każda porażka → null: panel pokazuje wtedy samo USD,
 * bez zmyślonego kursu z kodu. W trybie mock nie wychodzimy do sieci (testy i e2e mają być deterministyczne). */
export async function usdPln(): Promise<number | null> {
  if (getConfig().mockExternal) return null;
  try {
    const res = await fetch(NBP_URL, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return null;
    const mid = ((await res.json()) as { rates?: { mid?: unknown }[] }).rates?.[0]?.mid;
    return typeof mid === 'number' && mid > 0 ? mid : null;
  } catch (e) {
    log.warn('nbp', { err: errMessage(e) });
    return null;
  }
}
