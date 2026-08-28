export const nowIso = () => new Date().toISOString();
export const plusHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();
export const plusDays = (iso: string, d: number) => plusHours(iso, d * 24);
/** Data kalendarzowa (YYYY-MM-DD) w strefie klubu, nie w UTC — mecz z piątku 23:30 to dla trenera piątek,
 * a nie sobota. Używane w nazwach pobieranych plików; `sv-SE` daje format ISO bez ręcznego sklejania. */
export const dayPl = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date(iso));
