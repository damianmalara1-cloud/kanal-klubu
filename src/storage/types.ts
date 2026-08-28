export const SIGNED_URL_TTL_S = 3600;

export interface Storage {
  put(path: string, data: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<Buffer | null>;
  signedUrl(path: string, ttlSec: number): Promise<string>;
  remove(paths: string[]): Promise<void>;
}
