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
| `TEAMS` | tak | `młodziczki (2011+);młodzicy (2011+);…` | Lista drużyn do wyboru w formularzu, średnikiem. |
| `KLUB_PRO_TEAMS` | tak (może być pusta) | `młodziczki (2011+);młodzicy (2011+)` | Podzbiór `TEAMS` objęty programem KLUB PRO — decyduje, czy post dostaje stopkę/pas partnerów (razem z `PARTNER_INFO_ENABLED`). |
| `OPENROUTER_API_KEY` | tak (chyba że `AI_MOCK=true`) | — | Klucz do OpenRouter (generacja tekstu, model Haiku). |
| `AI_MODEL` | nie | `anthropic/claude-haiku-4.5` | Model używany do generacji opisu. |
| `AI_MOCK` | nie | `false` | `true` = generator zwraca tekst bez wywołania modelu (dev/test, brak kosztu). |
| `SUPABASE_URL` | tak (chyba że `MOCK_EXTERNAL=true`) | `https://<ref>.supabase.co` | Adres projektu Supabase (baza + storage). |
| `SUPABASE_SERVICE_KEY` | tak (chyba że `MOCK_EXTERNAL=true`) | — | Klucz `service_role` — serwer omija RLS (tabela `posts` nie ma polityk, dostęp tylko z serwera). |
| `PARTNER_INFO_ENABLED` | tak | `false` | Globalny wyłącznik stopki i pasa logotypów KLUB PRO — zostaje `false` do pisemnej zgody Fundacji LOTTO. |
| `CRON_SECRET` | tak (chyba że `MOCK_EXTERNAL=true`) | `openssl rand -hex 16` | Sprawdzany w `Authorization: Bearer <CRON_SECRET>` przy wywołaniu crona przez Vercel. |
| `MOCK_EXTERNAL` | nie | `false` | `true` = adapter pamięciowy zamiast Supabase (dev/test/e2e), auth crona pomijana. |

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
```

## Produkcja

Vercel (projekt `uks-kanal-klubu`) + Supabase (projekt `uks-kanal-klubu`, region EU). Deploy: `vercel --prod`. Migracje: `npx supabase db push` (`supabase/migrations/0001_posts.sql` — tabela `posts`, 20 kolumn, bucket `posts` prywatny). Cron: `/api/cron/purge` codziennie o 03:00 UTC (`vercel.json`), Vercel dołącza `Authorization: Bearer <CRON_SECRET>` sam.

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
- 60 wywołań modelu/h łącznie (regeneracje liczą się podwójnie w limicie).
- Zdjęcia: 0–10 na post, ≤ 4 MB każde, zmniejszane do max 2048 px.
- Szkice (`draft`) kasowane po 24 h.
- Gotowe posty (`done`) tracą pliki po 7 dniach — tekst i rekord zostają jako log.

## Gotchas

- `next.config.ts` musi mieć `serverExternalPackages: ['sharp', '@resvg/resvg-js', 'satori']` — bez tego bundling Next.js łamie wasm harfbuzzjs, na którym stoi satori, i render planszy pada w `next dev`/`next start`.
- `npm run lint` zgłasza znane błędy `react-hooks/set-state-in-effect` (`NewPostClient.tsx`, `Preview.tsx`) — świadomie zaakceptowane, nie są bramką: `next build` nie uruchamia eslinta i przechodzi czysto.
- Windows: nigdy `taskkill //IM node.exe` — zabija też inne procesy Node w systemie, nie tylko dev server tej appki.
