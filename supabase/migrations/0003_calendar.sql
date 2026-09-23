-- Kalendarz klubu (spec 2026-09-23 §4.1). Kosz: deleted_at != null zamiast twardego delete; cron kasuje po 30 dniach.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('trening','mecz','turniej','inne')),
  team text,                          -- wartość z TEAMS; null = cały klub (dozwolone tylko przy type='inne')
  title text not null,                -- trening: generowany („Trening · Ringwelska"); mecz: „vs <przeciwnik>"; turniej/inne: wpisany
  starts_at timestamptz not null,     -- mecz/turniej wyjazdowy: ZBIÓRKA; dom: godzina meczu
  ends_at timestamptz not null,       -- mecz/turniej wyjazdowy: POWRÓT
  all_day boolean not null default false,  -- turniej bez godzin; wtedy starts_at/ends_at = północ lokalna dnia początku / dnia PO końcu
  place text,                         -- hala / adres
  coaches text[] not null default '{}',    -- imiona z COACH_NAMES; trening może mieć dwóch
  details jsonb not null default '{}',     -- pola typu, patrz 4.2
  series_id uuid,                     -- trening cykliczny: wspólne dla wszystkich terminów serii
  created_by text not null,           -- imię trenera z chipsa albo 'admin'
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,             -- KOSZ: wiersz zostaje, znika z widoków i .ics; cron kasuje po 30 dniach
  deleted_by text
);
create index if not exists cal_starts on public.calendar_events (starts_at) where deleted_at is null;
create index if not exists cal_team_starts on public.calendar_events (team, starts_at) where deleted_at is null;
create index if not exists cal_series on public.calendar_events (series_id) where series_id is not null;
create index if not exists cal_deleted on public.calendar_events (deleted_at) where deleted_at is not null;
alter table public.calendar_events enable row level security; -- brak polityk = brak dostępu z anon; serwer używa secret key
revoke all on public.calendar_events from anon, authenticated;
