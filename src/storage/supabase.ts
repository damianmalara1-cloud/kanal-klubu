import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseStorageLike } from './types';

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  const status = typeof err.status === 'number' ? err.status : undefined;
  const statusCode = typeof err.statusCode === 'string' ? err.statusCode : undefined;
  const message = typeof err.message === 'string' ? err.message : '';
  return status === 404 || statusCode === '404' || (status === 400 && /not found/i.test(message)) || /not found/i.test(message);
}

export class SupabaseStorage implements SupabaseStorageLike {
  readonly kind = 'supabase' as const;

  private sb: SupabaseClient;

  constructor(url: string, key: string, private bucket = 'posts') {
    this.sb = createClient(url, key, { auth: { persistSession: false } });
  }

  async put(path: string, data: Buffer, contentType: string) {
    const { error } = await this.sb.storage.from(this.bucket).upload(path, data, { contentType, upsert: true });
    if (error) throw error;
  }

  async get(path: string) {
    const { data, error } = await this.sb.storage.from(this.bucket).download(path);
    if (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
    if (!data) return null;
    return Buffer.from(await data.arrayBuffer());
  }

  async signedUrl(path: string, ttlSec: number) {
    const { data, error } = await this.sb.storage.from(this.bucket).createSignedUrl(path, ttlSec);
    if (error) throw error;
    return data.signedUrl;
  }

  async remove(paths: string[]) {
    if (paths.length) {
      const { error } = await this.sb.storage.from(this.bucket).remove(paths);
      if (error) throw error;
    }
  }
}
