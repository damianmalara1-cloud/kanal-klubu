import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig() }));

const g = globalThis as { __kkStorage?: unknown };

describe('getMemoryStorage', () => {
  beforeEach(() => { resetAdapters(); vi.resetModules(); });

  // Regresja R-01: Next trzyma OSOBNĄ instancję modułu dla warstwy akcji/RSC i dla tras API. Singleton
  // siedzi na `globalThis`, więc obiekt jest wspólny, ale każda warstwa ma własny obiekt klasy
  // `MemoryStorage`. Rozpoznawanie po `instanceof` dawało wtedy `false` i `/api/file` zwracało 404
  // (plansza nie wyświetlała się w podglądzie ani na „Gotowe"). `vi.resetModules()` odtwarza dokładnie
  // ten układ: dwie kopie tego samego modułu w jednym procesie.
  it('rozpoznaje magazyn pamięciowy stworzony przez INNĄ kopię modułu (dwie warstwy bundla Next)', async () => {
    const { MemoryStorage: KopiaA } = await import('./memory');
    const obcy = new KopiaA('http://localhost:3000', 'mem');
    await obcy.put('a/b.png', Buffer.from('png'), 'image/png');
    g.__kkStorage = obcy;

    vi.resetModules();
    const { MemoryStorage: KopiaB } = await import('./memory');
    const { getMemoryStorage } = await import('./index');
    expect(KopiaB).not.toBe(KopiaA); // faktycznie dwie kopie klasy…
    expect(obcy instanceof KopiaB).toBe(false); // …więc `instanceof` by tu skłamał

    const mem = getMemoryStorage();
    expect(mem).not.toBeNull();
    expect(mem!.key).toBe('mem');
    expect((await mem!.get('a/b.png'))?.toString()).toBe('png');
    expect(mem!.contentType('a/b.png')).toBe('image/png');
  });

  it('magazyn Supabase → null (trasa /api/file istnieje tylko w trybie mock)', async () => {
    g.__kkStorage = { kind: 'supabase' };
    const { getMemoryStorage } = await import('./index');
    expect(getMemoryStorage()).toBeNull();
  });

  it('w trybie mock zwraca ten sam obiekt co getStorage()', async () => {
    const { getStorage, getMemoryStorage } = await import('./index');
    expect(getMemoryStorage()).toBe(getStorage());
  });
});
