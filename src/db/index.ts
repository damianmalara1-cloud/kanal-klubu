import 'server-only';
import { getConfig } from '@/config';
import { MemoryRepo } from './memory';
import { SupabaseRepo } from './supabase';
import type { PostsRepo } from './types';
export type { PostsRepo, NewPost } from './types';

const g = globalThis as unknown as { __kkRepo?: PostsRepo };
export function getRepo(): PostsRepo {
  if (!g.__kkRepo) {
    const c = getConfig();
    g.__kkRepo = c.mockExternal ? new MemoryRepo() : new SupabaseRepo(c.supabaseUrl, c.supabaseServiceKey);
  }
  return g.__kkRepo;
}
