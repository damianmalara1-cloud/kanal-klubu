/** Kilka drużyn w jednym poście (turniej, sukces, ogłoszenie) — w bazie, dzienniku i na planszy to nadal
 * jedno pole tekstowe `team`, sklejone separatorem. Dzięki temu schemat `posts.form` (jsonb), zdarzenia
 * i panel admina nie muszą wiedzieć o liście. Mecz zostaje przy jednej drużynie (jedna drużyna gra jeden mecz). */
export const TEAM_SEP = ' + ';

/** Maksimum drużyn w jednym poście — więcej nie mieści się na planszy (DataCell 455 px) ani w kickerze. */
export const MAX_TEAMS_PER_POST = 3;

/** Limit pola `team` przy kilku drużynach: 3 × 40 znaków (limit pojedynczej drużyny) + separatory. */
export const TEAM_MULTI_MAX = MAX_TEAMS_PER_POST * 40 + (MAX_TEAMS_PER_POST - 1) * TEAM_SEP.length;

export function splitTeams(team: string | null | undefined): string[] {
  if (!team) return [];
  return team
    .split(TEAM_SEP)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function joinTeams(teams: string[]): string {
  return [...new Set(teams.map((t) => t.trim()).filter(Boolean))].join(TEAM_SEP);
}

/** „Drużyna" / „Drużyny" — etykieta zależna od liczby, żeby plansza i prompt nie mówiły „Drużyna: A + B". */
export function teamLabel(team: string | null | undefined): 'Drużyna' | 'Drużyny' {
  return splitTeams(team).length > 1 ? 'Drużyny' : 'Drużyna';
}
