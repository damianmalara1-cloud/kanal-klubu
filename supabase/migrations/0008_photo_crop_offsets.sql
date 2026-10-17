-- Kadr zdjęcia po przejściu na suwaki (jak generator KPR): {dx, dy} = przesunięcie w px planszy, zoom = wielkość w %.
-- Stary format {x, y, zoom} (0007, object-position w %) nie ma odpowiednika 1:1 — wszystkie kadry wracają do domyślnego.
-- Wgrywać PO deployu kodu, który czyta oba formaty (normalizeCrop) — stary kod na nowym formacie liczyłby NaN.
alter table public.posts alter column photo_crop set default '{"dx":0,"dy":0,"zoom":100}'::jsonb;
update public.posts set photo_crop = '{"dx":0,"dy":0,"zoom":100}'::jsonb where not (photo_crop ? 'dx');
