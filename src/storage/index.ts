import 'server-only';
import { getConfig } from '@/config';
import { MemoryStorage } from './memory';
import { SupabaseStorage } from './supabase';
import type { Storage } from './types';

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

export function getMemoryStorage(): MemoryStorage | null {
  const s = getStorage();
  return s instanceof MemoryStorage ? s : null;
}
