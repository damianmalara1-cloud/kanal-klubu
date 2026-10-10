-- Styl zdjęcia na planszy: `klub` = duotone czerń→czerwień (dotychczasowy wygląd), `oryginal` = kolory z aparatu.
-- Default `klub`, więc istniejące posty i stary kod (insert bez kolumny) zachowują się jak dotąd.
alter table public.posts add column if not exists photo_style text not null default 'klub'
  check (photo_style in ('klub', 'oryginal'));
