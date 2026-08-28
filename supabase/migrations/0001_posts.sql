create table if not exists public.posts (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author text not null,
  type text not null check (type in ('mecz','turniej','sukces','ogloszenie')),
  form jsonb not null,
  photos text[] not null default '{}',
  hero_photo text,
  caption_ai text,
  caption text,
  headline text,
  kicker text,
  creative_path text,
  regen_count int not null default 0,
  fact_warning text,
  partner_info boolean not null default false,
  status text not null default 'draft' check (status in ('draft','done')),
  purge_after timestamptz,
  purged_at timestamptz,
  ip text
);
create index if not exists posts_author_created on public.posts (author, created_at desc);
create index if not exists posts_purge on public.posts (purge_after) where purged_at is null;
create index if not exists posts_ip_created on public.posts (ip, created_at);
alter table public.posts enable row level security; -- brak polityk = brak dostępu z anon; serwer używa service key
insert into storage.buckets (id, name, public) values ('posts', 'posts', false) on conflict (id) do nothing;
