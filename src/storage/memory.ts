import type { MemoryStorageLike } from './types';

export class MemoryStorage implements MemoryStorageLike {
  readonly kind = 'memory' as const;

  constructor(
    private appUrl: string,
    public readonly key: string,
    private files: Map<string, { data: Buffer; contentType: string }> = new Map(),
  ) {}

  async put(path: string, data: Buffer, contentType: string) {
    this.files.set(path, { data, contentType });
  }

  async get(path: string) {
    return this.files.get(path)?.data ?? null;
  }

  contentType(path: string) {
    return this.files.get(path)?.contentType ?? 'application/octet-stream';
  }

  async signedUrl(path: string, ttlSec: number) {
    return `${this.appUrl}/api/file/${path}?k=${this.key}`;
  }

  async remove(paths: string[]) {
    for (const p of paths) {
      this.files.delete(p);
    }
  }
}
