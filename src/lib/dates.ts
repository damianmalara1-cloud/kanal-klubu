export const nowIso = () => new Date().toISOString();
export const plusHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();
export const plusDays = (iso: string, d: number) => plusHours(iso, d * 24);
