/** Polska liczba mnoga: 1 → `one`, 2–4 (poza 12–14) → `few`, reszta (w tym 0) → `many`. Współdzielone przez
 * podgląd serii (`EventForm`) i kosz kalendarza (`Zniknie za`) — komunikaty piszemy zdaniem, nie samym
 * licznikiem, więc odmiana musi się zgadzać. Duplikat celowy: `components/photoProcess.ts` ma tę samą logikę,
 * ale nie eksportuje jej. */
export function plural(n: number, one: string, few: string, many: string): string {
  const rest = n % 10;
  const teen = n % 100;
  if (n === 1) return one;
  return rest >= 2 && rest <= 4 && !(teen >= 12 && teen <= 14) ? few : many;
}
