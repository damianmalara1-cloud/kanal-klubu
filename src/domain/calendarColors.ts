/** 13 kolorów o wyraźnie różnych odcieniach (13 = liczba trenerów/grup na sezon 2026/27). Kolor = pozycja
 * drużyny w `TEAMS`, więc dopisywanie nowych drużyn na końcu listy nie przemalowuje starych. */
export const PALETTE = ['#C12E26', '#1F6FEB', '#2E9E44', '#E8931D', '#7B3FB8', '#0FA3A8', '#D4457E', '#8B5A2B', '#5C6B1E', '#3A3F9E', '#B8860B', '#1B7F79', '#B03A6A'];
const GREY = '#8A8A8A';
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const fgFor = (bg: string) => ((lum(bg) + 0.05) / 0.05 >= (1.05) / (lum(bg) + 0.05) ? '#000000' : '#FFFFFF');
export function teamColor(team: string | null, teams: string[]): { bg: string; fg: string } {
  const i = team === null ? -1 : teams.indexOf(team);
  if (i < 0) return { bg: GREY, fg: '#FFFFFF' };
  const bg = PALETTE[i % PALETTE.length];
  return { bg, fg: fgFor(bg) };
}
