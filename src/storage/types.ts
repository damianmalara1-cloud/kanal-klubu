export const SIGNED_URL_TTL_S = 3600;

interface StorageBase {
  put(path: string, data: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<Buffer | null>;
  signedUrl(path: string, ttlSec: number): Promise<string>;
  remove(paths: string[]): Promise<void>;
}

/** `kind` zamiast `instanceof`: Next trzyma osobną instancję każdego modułu serwerowego dla warstwy
 * akcji/RSC i dla tras API. Singleton siedzi na `globalThis`, więc SAM OBIEKT jest wspólny, ale każda
 * warstwa ma własny obiekt klasy `MemoryStorage` — `instanceof` w trasie `/api/file` dawał wtedy `false`
 * i plansza wracała 404 (regresja R-01). Znacznik na strukturze przeżywa granicę warstw, tożsamość
 * klasy nie. Tej samej zasady trzymaj się przy każdym adapterze chowanym na `globalThis`. */
export interface MemoryStorageLike extends StorageBase {
  readonly kind: 'memory';
  /** Klucz instancji pamięci w URL-u (`?k=`) — nie sekret trenera. */
  readonly key: string;
  contentType(path: string): string;
}

export interface SupabaseStorageLike extends StorageBase {
  readonly kind: 'supabase';
}

export type Storage = MemoryStorageLike | SupabaseStorageLike;
