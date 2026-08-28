import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Storage } from './types';

export class SupabaseStorage implements Storage {
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
    if (error) return null;
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
