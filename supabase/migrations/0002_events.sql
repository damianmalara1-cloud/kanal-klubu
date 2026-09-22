-- Dziennik zdarzeń panelu admina (spec 2026-09-22 §4). Append-only; treść (`content`) zerowana przez cron (§6).
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  type text not null check (type in (
    'draft_created','photo_uploaded','hero_set','ai_generated','ai_failed',
    'finished','downloaded','limit_hit','admin_login','admin_login_failed')),
  author text,
  post_id uuid,        -- bez FK: zdarzenia porzuconego szkicu przeżywają jego skasowanie
  cost_usd numeric,    -- ai_generated/ai_failed: suma ZNANYCH kosztów; wywołania bez danych → meta.unknownCostCalls
  meta jsonb not null default '{}',
  content jsonb
);
create index if not exists events_at on public.events (at desc);
create index if not exists events_post on public.events (post_id, at) where post_id is not null;
create index if not exists events_type_at on public.events (type, at);
alter table public.events enable row level security; -- brak polityk = brak dostępu z anon; serwer używa secret key
revoke all on public.events from anon, authenticated;
