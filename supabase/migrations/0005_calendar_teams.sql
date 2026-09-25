-- Kilka drużyn w jednym wydarzeniu (wspólny trening, turniej dwóch roczników): `teams text[]`, pusta = cały klub.
-- Stara kolumna `team` zostaje na czas przejścia — kod zapisuje w niej pierwszą drużynę, a odczyt wiersza
-- z pustym `teams` bierze `team` (rows zapisane przez stary kod między migracją a deployem). Do usunięcia osobną migracją.
alter table public.calendar_events add column if not exists teams text[] not null default '{}';
update public.calendar_events set teams = array[team] where team is not null and teams = '{}';
create index if not exists cal_teams on public.calendar_events using gin (teams) where deleted_at is null;
comment on column public.calendar_events.team is 'PRZESTARZAŁE (0005): pierwsza drużyna z teams, tylko dla zgodności';
