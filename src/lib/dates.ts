export const nowIso = () => new Date().toISOString();
export const plusHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();
export const plusDays = (iso: string, d: number) => plusHours(iso, d * 24);
/** Data kalendarzowa (YYYY-MM-DD) w strefie klubu, nie w UTC — mecz z piątku 23:30 to dla trenera piątek,
 * a nie sobota. Używane w nazwach pobieranych plików; `sv-SE` daje format ISO bez ręcznego sklejania. */
export const dayPl = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date(iso));

export const TZ = 'Europe/Warsaw';

/** Przesunięcie strefy Warszawy względem UTC w minutach (+60 zimą, +120 latem) w danej chwili. Przeniesione
 * z `admin/month.ts`, bo kalendarz liczy terminy z czasu lokalnego („wtorek 16:30"), nie z dodawania 7×24 h. */
export function tzOffsetMin(d: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** `YYYY-MM-DD` + `HH:MM` w czasie Warszawy → ISO UTC. Dwa przebiegi: pierwszy zgaduje przesunięcie z „naiwnej"
 * chwili UTC, drugi sprawdza je w wyniku — na dobę zmiany czasu pierwszy strzał bywa o godzinę obok. */
export function localToIso(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  const guess = naive - tzOffsetMin(new Date(naive)) * 60_000;
  return new Date(naive - tzOffsetMin(new Date(guess)) * 60_000).toISOString();
}

const WD: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
export function isoToLocal(iso: string): { date: string; time: string; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}`, weekday: WD[g('weekday')] ?? 0 };
}

/** Arytmetyka na samej dacie kalendarzowej (bez strefy): `YYYY-MM-DD` ± n dni. */
export function addDays(date: string, n: number): string {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}
/** 1 = poniedziałek … 7 = niedziela. */
export function weekdayOf(date: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}
export const weekStart = (date: string): string => addDays(date, 1 - weekdayOf(date));
export const todayPl = (): string => dayPl(nowIso());
