# Kanał Klubu — UKS Banino

Aplikacja dla trenerów: formularz + zdjęcia → AI pisze post w głosie klubu + plansza 1080×1350 → trener poprawia → „Gotowe" → kopiuje tekst i pobiera planszę/zdjęcia → publikuje sam na stronie klubu na Facebooku. Bez logowania (link z sekretem), bez magazynu zdjęć (pliki kasowane po 7 dniach).

## Uruchomienie lokalne

```bash
npm i && npm test && npm run typecheck
```

Zmienne środowiskowe — patrz tabela niżej. Do pracy bez sieci i bez Supabase: `MOCK_EXTERNAL=true AI_MOCK=true` (adapter pamięciowy zamiast bazy/storage'u, generator zwraca tekst bez wywołania modelu).

```bash
npm run dev
# → http://localhost:3000/t/<COACH_LINK_SECRET>
```

- `npm run e2e` — testy Playwright; sam startuje własny dev server na porcie 3000 (`webServer` w `playwright.config.ts`), tryb mock.
- `npm run samples` — generuje 8 przykładowych plansz do `samples/` (katalog gitignored, regenerowany na żądanie).

## Zmienne środowiskowe

| Zmienna | Wymagana w prod? | Przykład / domyślna | Do czego |
|---|---|---|---|
| `APP_URL` | tak | `https://uks-kanal-klubu.vercel.app` | Bazowy URL appki — nagłówek `HTTP-Referer`/`X-Title` do OpenRouter i budowa linków do plików w trybie pamięciowym (dev/mock). |
| `COACH_LINK_SECRET` | tak (min. 16 znaków) | `openssl rand -hex 16` | Sekret w linku trenera (`/t/<sekret>`) — jedyna „autoryzacja" w appce, bez logowania. |
| `COACH_NAMES` | tak | `Ania,Krzysiek` | Lista imion trenerów do wyboru w formularzu, po przecinku. |
| `TEAMS` | tak | `młodziczki (2011+);młodzicy (2011+);…` | Lista drużyn do wyboru w formularzu, średnikiem. Turniej/sukces/ogłoszenie przyjmują kilka drużyn naraz (chipy, max 3) — w bazie i na planszy to jedno pole `team` sklejone ` + ` (`domain/teams.ts`); stopka KLUB PRO wchodzi, gdy którakolwiek z nich jest w `KLUB_PRO_TEAMS`. Mecz zostaje przy jednej drużynie. |
| `KLUB_PRO_TEAMS` | tak (może być pusta) | `młodziczki (2011+);młodzicy (2011+)` | Podzbiór `TEAMS` objęty programem KLUB PRO — decyduje, czy post dostaje stopkę/pas partnerów (razem z `PARTNER_INFO_ENABLED`). |
| `OPENROUTER_API_KEY` | tak (chyba że `AI_MOCK=true`) | — | Klucz do OpenRouter (generacja tekstu, model Haiku). |
| `AI_MODEL` | nie | `anthropic/claude-haiku-4.5` | Model używany do generacji opisu. |
| `AI_MOCK` | nie | `false` | `true` = generator zwraca tekst bez wywołania modelu (dev/test, brak kosztu). |
| `SUPABASE_URL` | tak (chyba że `MOCK_EXTERNAL=true`) | `https://<ref>.supabase.co` | Adres projektu Supabase (baza + storage). |
| `SUPABASE_SERVICE_KEY` | tak (chyba że `MOCK_EXTERNAL=true`) | — | Klucz `service_role` — serwer omija RLS (tabela `posts` nie ma polityk, dostęp tylko z serwera). |
| `PARTNER_INFO_ENABLED` | tak | `false` | Globalny wyłącznik stopki i pasa logotypów KLUB PRO — zostaje `false` do pisemnej zgody Fundacji LOTTO. |
| `CRON_SECRET` | tak (chyba że `MOCK_EXTERNAL=true`) | `openssl rand -hex 16` | Sprawdzany w `Authorization: Bearer <CRON_SECRET>` przy wywołaniu crona przez Vercel. |
| `MOCK_EXTERNAL` | nie | `false` | `true` = adapter pamięciowy zamiast Supabase (dev/test/e2e), auth crona pomijana. |
| `ADMIN_PASSWORD` | nie (bez niego panel `/admin` jest wyłączony) | `openssl rand -base64 18` (min. 12 znaków) | Hasło do panelu admina `/admin` (użycie i koszty AI). Ciasteczko sesji to HMAC kluczowany tym hasłem — musi być wartością losową, wygenerowaną, nie zapamiętywalnym hasłem. Ustawiasz sam w Vercelu jako Sensitive; zmiana hasła wylogowuje wszystkie sesje. |
| `SEASON_END` | nie | `2027-06-30` | Koniec sezonu — domyślna data „do" przy serii treningów i górna granica pliku .ics (+90 dni). |

### Zmienne środowiskowe — treść `.env.example`

Plik `.env.example` musi założyć Damian ręcznie — globalna reguła na tej maszynie blokuje agentom zapis jakiegokolwiek pliku `.env*`. Treść do skopiowania (`cp` z tego bloku), placeholdery spójne z tabelą wyżej:

```
APP_URL=http://localhost:3000
COACH_LINK_SECRET=zmien-na-16-losowych-znakow
COACH_NAMES=Ania,Krzysiek
TEAMS=młodziczki (2011+);młodzicy (2011+);dziewczęta 2013+;chłopcy 2013+;dziewczęta 2014+;chłopcy 2014+;grupa mieszana 2015+;juniorki młodsze
KLUB_PRO_TEAMS=młodziczki (2011+);młodzicy (2011+)
OPENROUTER_API_KEY=
AI_MODEL=anthropic/claude-haiku-4.5
AI_MOCK=false
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PARTNER_INFO_ENABLED=false
CRON_SECRET=
MOCK_EXTERNAL=false
ADMIN_PASSWORD=
SEASON_END=2027-06-30
```

## Panel admina

`/admin` — hasło z `ADMIN_PASSWORD` (min. 12 znaków; bez niego trasy `/admin*` zwracają 404). Po zalogowaniu ciasteczko `kk_admin` na 30 dni (HttpOnly, SameSite=Strict, ścieżka `/admin`); zmiana hasła w Vercelu wylogowuje wszystkie sesje. Po 5 błędnych próbach z jednego IP logowanie blokuje się na 15 minut.

- **Pulpit:** koszt AI miesiąca (USD + ≈ zł po kursie NBP), prognoza na koniec miesiąca, gotowe posty i porzucone szkice, generacje i błędy AI, tabela per trener, oś zdarzeń z filtrami (`?m=YYYY-MM&a=<trener>&t=<typ>`).
- **Historia posta** (`/admin/post/<id>`): zdarzenia z kosztem, porównanie ostatniej wersji AI z tekstem opublikowanym, wersje z regeneracji i notatki trenera.
- **Źródło danych:** tabela `events` (`supabase/migrations/0002_events.sql`). Koszt = `usage.cost` z odpowiedzi OpenRoutera; wywołania bez tej informacji (timeout, brak pola) liczone osobno jako „bez danych o koszcie".
- **Retencja** (cron `/api/cron/purge`): treść zdarzeń (teksty, notatki) znika razem z postem — szkic po 24 h, gotowy po 7 dniach, najpóźniej po 8 dniach; nieudane logowania (z IP) po 1 dniu; wszystkie zdarzenia po 365 dniach.

## Kalendarz klubowy

Kalendarz treningów, meczów i turniejów klubu — trenerzy dodają i edytują terminy (pojedyncze albo serię) z tego samego linku co formularz posta. Link subskrypcji `.ics` zawiera ten sam sekret trenera co link do edycji — **nigdy nie przekazuj go rodzicom**; żeby rodzice mogli bezpiecznie subskrybować kalendarz w telefonie, potrzebny byłby osobny sekret tylko do odczytu (np. `ICS_SECRET`), którego appka dziś nie ma.

- **Trasy trenera** (`/t/<COACH_LINK_SECRET>/kalendarz`): `/kalendarz` (tydzień), `/miesiac` (miesiąc), `/nowy` (nowe wydarzenie), `/<id>` (szczegóły/edycja/usunięcie), `/telefon` (linki do subskrypcji na iPhone/Androida — z tym samym ostrzeżeniem o sekrecie).
- **Subskrypcja .ics** (`/api/ics/<COACH_LINK_SECRET>/<slug>.ics`): `klub.ics` dla całego klubu albo `<slug-drużyny>.ics` dla jednej grupy — ten sam sekret co link trenera. `<slug-drużyny>.ics` (i filtr drużyny w widoku tydzień/miesiąc) pokazuje też wydarzenia całego klubu (`team = null`), nie tylko tej jednej grupy — trener musi widzieć zbiórki całego klubu obok swoich. Rotacja `COACH_LINK_SECRET` (np. po wycieku) unieważnia też te subskrypcje — trzeba rozesłać nowe linki.
- **Kosz** (`/admin/kalendarz/kosz`): usunięte wydarzenia i serie trafiają do kosza na 30 dni (`CALENDAR_TRASH_DAYS`) z możliwością przywrócenia; cron `/api/cron/purge` kasuje je na trwałe dopiero po tym oknie. „Przywróć serię" wraca tylko terminy usunięte w tym samym momencie (ten sam `deletedAt`) — termin odwołany osobno wcześniej zostaje w koszu.
- **Dziennik** (`/admin`, oś zdarzeń): dodanie/zmiana/usunięcie/przywrócenie terminu albo serii loguje się jako zdarzenia `cal_created`, `cal_series_created`, `cal_updated`, `cal_series_updated`, `cal_deleted`, `cal_series_deleted`, `cal_restored`.
- **Migracje:** `supabase/migrations/0003_calendar.sql` (tabela kalendarza) i `0004_events_calendar_types.sql` (nowe typy `cal_*` w dzienniku) — wdrożyć przez Supabase MCP (`apply_migration`) albo edytor SQL w dashboardzie Supabase przed deployem kodu kalendarza, inaczej appka pisze do nieistniejącej tabeli/typu.
- **Drużyny i kolory:** kolor grupy w kalendarzu i w .ics zależy od pozycji drużyny na liście `TEAMS` — nowe drużyny zawsze dopisuj na końcu, inaczej przemalujesz kolory istniejących. Usunięcie drużyny z `TEAMS` nie blokuje edycji istniejących wydarzeń tej drużyny (wciąż widoczna jako opcja na formularzu tego konkretnego wydarzenia), ale znika z listy dla nowych.
- **Dane dzieci:** pole „Uwagi" na formularzu wydarzenia ma wprost zaznaczone „bez nazwisk dzieci" — kalendarz nie jest miejscem na dane osobowe zawodniczek i zawodników.

## Produkcja

Vercel (projekt `uks-kanal-klubu`) + Supabase (projekt `uks-kanal-klubu`, region EU). Deploy: `vercel --prod`. Cron: `/api/cron/purge` codziennie o 03:00 UTC (`vercel.json`), Vercel dołącza `Authorization: Bearer <CRON_SECRET>` sam.

Migracje (`supabase/migrations/0001_posts.sql` — tabela `posts`, 20 kolumn, bucket `posts` prywatny). `db push` działa dopiero po zalogowaniu i podpięciu projektu — bez tego kroku kończy się błędem o braku linku, nie o migracji:

```bash
npx supabase login
npx supabase link --project-ref <ref>   # <ref> = poddomena z SUPABASE_URL (https://<ref>.supabase.co)
npx supabase db push
```

Po `vercel --prod` sprawdź crona ręcznie — nie czekaj do 03:00, żeby się dowiedzieć, że `CRON_SECRET` nie zgadza się z tym w Vercelu:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/purge
# → {"purged":0,"deletedDrafts":0,"failed":0}
```

`failed > 0` = któryś post nie dał się przeczyścić (szczegóły w `vercel logs`, wpis `purge` z `id`). Odpowiedź `unauthorized` (401) = zły albo brakujący sekret; w logu zostaje wtedy wpis `cron: unauthorized` z `hasSecret` (samej wartości sekretu appka nigdy nie loguje).

### Smoke po deployu — zanim link pójdzie do trenerów

Jedno przejście na produkcji, z telefonu, na prawdziwych danych — mock nie sprawdzi ani OpenRoutera, ani Supabase, ani uploadu z aparatu:

1. Otwórz `https://<app>/t/<COACH_LINK_SECRET>`, wybierz imię, typ **Mecz**.
2. Wypełnij drużynę, rywala i wynik, dodaj **prawdziwe zdjęcie z telefonu** (nie zrzut ekranu — chodzi o EXIF i rozmiar z aparatu).
3. „Wygeneruj post" → sprawdź, czy tekst zgadza się z wynikiem i czy plansza ma zdjęcie.
4. „Gotowe" → skopiuj tekst, pobierz planszę i zdjęcie, otwórz oba pobrane pliki.
5. Curl crona (wyżej) → `failed: 0`.

Dopiero po tym roześlij link trenerom.

## Jak…

- **dodać trenera:** `vercel env` → `COACH_NAMES` (po przecinku) → `vercel --prod`.
- **zmienić drużyny / sezon:** `TEAMS` i `KLUB_PRO_TEAMS` (średnik) → `vercel --prod`. Program KLUB PRO 2026 obejmuje tylko młodziczki i młodzików.
- **włączyć stopkę i pas partnerów KLUB PRO:** po mailowej zgodzie Fundacji → `PARTNER_INFO_ENABLED=true` → `vercel --prod`.
- **zmienić link trenera (wyciekł):** nowy `COACH_LINK_SECRET` → `vercel --prod` → roześlij nowy link.
- **podejrzeć logi:** `vercel logs` (JSON, poziomy info/warn/error).
- **koszty AI:** OpenRouter, klucz z limitem 5 USD/mc; jedna generacja ≈ 0,003 USD.

## Limity

- 3 regeneracje na post (`MAX_REGEN`), pierwsza generacja się nie liczy.
- 20 postów/h z jednego IP.
- 60 generacji/h łącznie, licząc `regen_count + 1` na post (czyli liczbę kliknięć „Wygeneruj"/„Wygeneruj inaczej"). Szkice bez ani jednej generacji nie wchodzą do limitu. Uwaga: jedna generacja może pójść do modelu więcej niż raz — ponowienie po niepoprawnej odpowiedzi i jedna poprawka strażnika faktów (`src/ai/generate.ts`) — i te dodatkowe wywołania nie są liczone ani widoczne dla trenera. Limit chroni budżet zgrubnie, nie co do jednego requestu.
- Zdjęcia: 0–10 na post, ≤ 4 MB każde, zmniejszane do max 2048 px.
- Szkice (`draft`) kasowane po 24 h.
- Gotowe posty (`done`) tracą pliki po 7 dniach — tekst i rekord zostają jako log.

## Gotchas

- `next.config.ts` musi mieć `serverExternalPackages: ['sharp', '@resvg/resvg-js', 'satori']` — bez tego bundling Next.js łamie wasm harfbuzzjs, na którym stoi satori, i render planszy pada w `next dev`/`next start`.
- `npm run lint` zgłasza błędy reguły `react-hooks/set-state-in-effect` w komponentach klienckich, które czytają `localStorage` w efekcie (obecnie 2 pliki: `StartClient.tsx`, `NewPostClient.tsx`; stan na dziś: 15 problemów — 2 błędy + 13 warningów). Świadomie zaakceptowane, nie są bramką: `next build` nie uruchamia eslinta i przechodzi czysto. Liczba plików/problemów rośnie z każdym nowym komponentem czytającym `localStorage` w efekcie — nie traktuj tych 2 jako zamkniętej listy, sprawdź `npm run lint` przy zmianach.
- Windows: nigdy `taskkill //IM node.exe` — zabija też inne procesy Node w systemie, nie tylko dev server tej appki.
