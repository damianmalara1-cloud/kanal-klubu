import type { PostType } from '@/domain/types';

/** Mapuje płaskie `values` z formularza na kształt oczekiwany przez `parseForm` (workflow/draft) — jedyny
 * typ, który tego wymaga, to `sukces` (pola `name0..2` w UI → tablica `names`). Czysta funkcja, testowalna
 * bez DOM/React (ruling 3, task-16). */
export function toForm(type: PostType, v: Record<string, string>): Record<string, unknown> {
  if (type === 'sukces') {
    return { names: [v.name0, v.name1, v.name2].map((x) => x ?? ''), kind: v.kind ?? 'kadra', team: v.team ?? '', details: v.details ?? '' };
  }
  return v;
}
