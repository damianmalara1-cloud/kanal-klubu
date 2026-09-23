-- Kalendarz (spec 2026-09-23 §4.3): nowe typy zdarzeń w dzienniku. `post_id` zostaje null; id wydarzenia w meta.eventId.
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in (
  'draft_created','photo_uploaded','hero_set','ai_generated','ai_failed',
  'finished','downloaded','limit_hit','admin_login','admin_login_failed',
  'cal_created','cal_series_created','cal_updated','cal_series_updated','cal_deleted','cal_series_deleted','cal_restored'));
