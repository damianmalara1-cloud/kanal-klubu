export type DiffOp = 'same' | 'add' | 'del';
export interface DiffPart { op: DiffOp; text: string }

/** Słowa i białe znaki jako osobne tokeny — dzięki temu diff zachowuje akapity tekstu posta. */
const tokens = (s: string): string[] => s.match(/\S+|\s+/g) ?? [];

export const countWords = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** Powyżej tego rozmiaru tablicy LCS (tokeny a × tokeny b) nie liczymy diffu słowo po słowie. Tekst posta to ~150-300 słów
 * (~600 tokenów razem z odstępami), więc limit łapie tylko patologię — wtedy wynik to „całość usunięta, całość dodana". */
const MAX_CELLS = 4_000_000;

function merge(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.op === p.op) last.text += p.text;
    else out.push({ ...p });
  }
  return out;
}

export function wordDiff(a: string, b: string): DiffPart[] {
  const x = tokens(a), y = tokens(b);
  const n = x.length, m = y.length;
  if (n * m > MAX_CELLS) {
    return merge([...(a ? [{ op: 'del' as const, text: a }] : []), ...(b ? [{ op: 'add' as const, text: b }] : [])]);
  }
  // L[i][j] = długość LCS dla x[i..] i y[j..]
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const out: DiffPart[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ op: 'same', text: x[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ op: 'del', text: x[i] }); i++; }
    else { out.push({ op: 'add', text: y[j] }); j++; }
  }
  while (i < n) out.push({ op: 'del', text: x[i++] });
  while (j < m) out.push({ op: 'add', text: y[j++] });
  return merge(out);
}

/** % zmian tekstu (spec §4): słowa dodane + usunięte względem liczby słów tekstu AI, zaokrąglone, obcięte do 100. */
export function changedPct(ai: string, final: string): number {
  const base = countWords(ai);
  if (base === 0) return countWords(final) === 0 ? 0 : 100;
  const changed = wordDiff(ai, final).filter((p) => p.op !== 'same').reduce((s, p) => s + countWords(p.text), 0);
  return Math.min(100, Math.round((changed / base) * 100));
}
