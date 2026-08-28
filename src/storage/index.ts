import 'server-only';
import { getConfig } from '@/config';
import { MemoryStorage } from './memory';
import { SupabaseStorage } from './supabase';
import type { MemoryStorageLike, Storage } from './types';

export type { Storage } from './types';
export { SIGNED_URL_TTL_S } from './types';

const g = globalThis as unknown as { __kkStorage?: Storage };

export function getStorage(): Storage {
  if (!g.__kkStorage) {
    const c = getConfig();
    g.__kkStorage = c.mockExternal
      ? new MemoryStorage(c.appUrl, 'mem')
      : new SupabaseStorage(c.supabaseUrl, c.supabaseServiceKey);
  }
  return g.__kkStorage;
}

/** Magazyn pamięciowy albo `null` poza trybem mock. Rozpoznanie po `kind`, NIE po `instanceof` —
 * obiekt na `globalThis` bywa instancją innej kopii klasy niż ta, którą widzi trasa API (patrz
 * komentarz w `types.ts`, regresja R-01). */
export function getMemoryStorage(): MemoryStorageLike | null {
  const s = getStorage();
  return s.kind === 'memory' ? s : null;
}
