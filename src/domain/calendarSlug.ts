/** Uwaga: `ł` nie rozkłada się przez NFD (nie ma znaku łączącego), stąd osobny `replace`. */
export const teamSlug = (team: string): string =>
  team.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** slug → nazwa drużyny; kolizja slugów to błąd konfiguracji (dwie drużyny miałyby jeden plik .ics). */
export function slugMap(teams: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const t of teams) {
    const s = teamSlug(t);
    if (m.has(s)) throw new Error(`TEAMS: kolizja slugów „${m.get(s)}" i „${t}" (${s})`);
    m.set(s, t);
  }
  return m;
}
