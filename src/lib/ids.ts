import { randomUUID } from 'node:crypto';
export const newId = () => randomUUID();

/** Format kolumny `uuid` w Postgresie — wartość spoza niego leci do bazy jako błąd składni (22P02) i wraca jako 500,
 * choć znaczy po prostu „nie ma takiego rekordu". Wspólne dla `db/supabase.ts` i `events/supabase.ts`. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
