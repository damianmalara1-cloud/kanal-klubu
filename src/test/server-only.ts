// Pusty moduł podstawiany pod `server-only` w vitest (patrz `resolve.alias` w `vitest.config.ts`).
// Prawdziwy pakiet poza runtime React Server (vitest/node, `tsx scripts/*`) rzuca już przy imporcie —
// a `config`/`db`/`storage` importujemy w testach jednostkowych wprost. Strażnik ma pilnować bundla
// klienckiego Next.js, nie blokować testów.
export {};
