-- Kadr zdjęcia na planszy: punkt zaczepienia x/y w % (jak CSS object-position) i przybliżenie w % (100 = bez przybliżenia).
-- Default = środek bez przybliżenia, czyli dotychczasowy wygląd — istniejące posty i stary kod (insert bez kolumny) bez zmian.
alter table public.posts add column if not exists photo_crop jsonb not null default '{"x":50,"y":50,"zoom":100}'::jsonb;
