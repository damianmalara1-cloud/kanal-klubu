import { test, expect } from '@playwright/test';
const SECRET = 'test-secret-1234567890';

test('zły sekret → 404', async ({ page }) => {
  const r = await page.goto('/t/zly-sekret');
  expect(r?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Nie znaleziono' })).toBeVisible();
});

test('trener: mecz od formularza do skopiowania tekstu i pobrania planszy', async ({ page }) => {
  await page.goto(`/t/${SECRET}`);
  await page.getByRole('button', { name: 'Krzysiek' }).click();
  await page.getByRole('link', { name: 'Mecz' }).click();
  await page.getByLabel('Drużyna').selectOption('młodziczki (2011+)');
  await page.getByLabel('Rywal', { exact: true }).fill('Sokół Gdańsk'); // exact: bez tego substring-match łapie też "Bramki rywala"
  await page.getByLabel('Bramki UKS Banino').fill('24');
  await page.getByLabel('Bramki rywala').fill('18');
  await page.getByLabel('Dodaj zdjęcia').setInputFiles(['tests/e2e/fixtures/foto.jpg', 'tests/e2e/fixtures/foto.jpg']);
  await expect(page.getByRole('button', { name: /Zdjęcie 2 na planszę/ })).toBeVisible();
  await page.getByRole('button', { name: /Zdjęcie 2 na planszę/ }).click();
  await page.getByRole('button', { name: 'Wygeneruj post' }).click();
  await expect(page.getByRole('img', { name: 'Plansza' })).toBeVisible({ timeout: 90_000 });
  const ta = page.getByLabel('Tekst posta');
  expect(await ta.inputValue()).toContain('24 : 18');
  await page.getByRole('button', { name: 'Wygeneruj inaczej' }).click();
  await expect(page.getByRole('img', { name: 'Plansza' })).toBeVisible({ timeout: 90_000 });
  await page.getByLabel('Tekst posta').fill('Wygrana 24 : 18 z Sokołem Gdańsk. Dziękujemy za doping.');
  // Ręczna poprawka przeżywa objazd przez formularz (UAT D-03): tekst mieszka w NewPostClient, nie w Preview.
  await page.getByRole('button', { name: 'Popraw dane' }).click();
  await page.getByRole('button', { name: 'Wróć do podglądu' }).click();
  expect(await page.getByLabel('Tekst posta').inputValue()).toBe('Wygrana 24 : 18 z Sokołem Gdańsk. Dziękujemy za doping.');
  await page.getByRole('button', { name: 'Gotowe' }).click();

  await expect(page.getByRole('heading', { name: 'Gotowe' })).toBeVisible({ timeout: 30_000 });
  const finalText = await page.getByLabel('Tekst posta').inputValue();
  expect(finalText).toContain('Wygrana 24 : 18 z Sokołem Gdańsk.');
  expect(finalText).toContain('#UKSBanino #GminaŻukowo #RazemTworzymyHistorię');
  expect(finalText).not.toContain('KLUB PRO'); // PARTNER_INFO_ENABLED=false w E2E
  await page.getByRole('button', { name: 'Kopiuj tekst' }).click();
  await expect(page.getByRole('status')).toHaveText('Skopiowano');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  // Windows normalizuje \n → \r\n przy zapisie/odczycie schowka (OS-owa konwencja, nie błąd appki) — porównujemy po normalizacji.
  expect(clip.replace(/\r\n/g, '\n')).toBe(finalText);

  const href = await page.getByRole('link', { name: 'Pobierz planszę' }).getAttribute('href');
  expect(href).toMatch(/^\/api\/download\/[0-9a-f-]{36}\/plansza\?secret=/);
  const png = await page.request.get(href!);
  expect(png.status()).toBe(200);
  expect(png.headers()['content-type']).toBe('image/png');
  expect(png.headers()['content-disposition']).toMatch(/^attachment; filename="uks-banino-mecz-\d{4}-\d{2}-\d{2}-plansza\.png"$/);
  expect((await png.body()).subarray(0, 4).toString('hex')).toBe('89504e47');
  const jpg = await page.request.get((await page.getByRole('link', { name: 'Pobierz zdjęcie 1' }).getAttribute('href'))!);
  expect(jpg.status()).toBe(200); expect(jpg.headers()['content-type']).toBe('image/jpeg');
  expect(jpg.headers()['content-disposition']).toMatch(/^attachment; filename="uks-banino-mecz-\d{4}-\d{2}-\d{2}-zdjecie-1\.jpg"$/);

  await page.getByRole('link', { name: 'Dodaj kolejny' }).click();
  await expect(page.getByText('Gotowy')).toBeVisible();
  await page.getByRole('link', { name: /Mecz · UKS Banino 24 : 18 Sokół Gdańsk/ }).click();
  await expect(page.getByRole('heading', { name: 'Gotowe' })).toBeVisible();
});

// Drugi, krótki przebieg: rzeczy, które trener robi POZA szczęśliwą ścieżką — poprawianie tego, co już wpisał.
test('trener: drużyna spoza listy, powrót po odświeżeniu, usuwanie zdjęcia', async ({ page }) => {
  await page.goto(`/t/${SECRET}`);
  await page.getByRole('button', { name: 'Ania' }).click();
  await page.getByRole('link', { name: 'Mecz' }).click();

  // C2/M-8: drużyna spoza listy — po wybraniu „inna" wolny tekst idzie jako `team` (spec §3.1).
  await page.getByLabel('Drużyna', { exact: true }).selectOption({ label: 'inna' });
  await page.getByLabel('Inna drużyna').fill('oldboye');
  await page.getByLabel('Rywal', { exact: true }).fill('Sokół Gdańsk');
  await page.getByLabel('Bramki UKS Banino').fill('30');
  await page.getByLabel('Bramki rywala').fill('21');

  // D-02: przerwana praca (odświeżenie, blokada telefonu) nie kasuje formularza.
  await page.reload();
  await expect(page.getByLabel('Inna drużyna')).toHaveValue('oldboye'); // tryb „inna" odtworzony z samej wartości
  await expect(page.getByLabel('Rywal', { exact: true })).toHaveValue('Sokół Gdańsk');
  await expect(page.getByLabel('Bramki UKS Banino')).toHaveValue('30');
  await expect(page.getByLabel('Bramki rywala')).toHaveValue('21');

  // C1/D-01: dodane zdjęcie da się usunąć (bez tego zły plik blokował cały przepływ).
  await page.getByLabel('Dodaj zdjęcia').setInputFiles(['tests/e2e/fixtures/foto.jpg', 'tests/e2e/fixtures/foto.jpg']);
  await expect(page.getByText('Zdjęcia (2/10)')).toBeVisible();
  await page.getByRole('button', { name: 'Usuń zdjęcie 1' }).click();
  await expect(page.getByText('Zdjęcia (1/10)')).toBeVisible();
  await expect(page.getByRole('button', { name: /Zdjęcie 2 na planszę/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Wygeneruj post' }).click();
  await expect(page.getByRole('img', { name: 'Plansza' })).toBeVisible({ timeout: 90_000 });

  // D-11: za krótki tekst blokuje „Gotowe", ale mówi dlaczego.
  await page.getByLabel('Tekst posta').fill('krótko');
  await expect(page.getByRole('button', { name: 'Gotowe' })).toBeDisabled();
  await expect(page.getByText('Tekst musi mieć co najmniej 20 znaków')).toBeVisible();

  await page.getByLabel('Tekst posta').fill('Wygrana 30 : 21 z Sokołem Gdańsk. Brawo oldboye.');
  await expect(page.getByText('Tekst musi mieć co najmniej 20 znaków')).toHaveCount(0);
  await page.getByRole('button', { name: 'Gotowe' }).click();
  await expect(page.getByRole('heading', { name: 'Gotowe' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Mecz · UKS Banino 30 : 21 Sokół Gdańsk · oldboye/)).toBeVisible();
});

// D-07: wejście prosto na formularz (zakładka, link z czatu) mówi o braku imienia od razu, nie po wypełnieniu.
test('bez wybranego imienia formularz od razu o tym mówi', async ({ page }) => {
  await page.goto(`/t/${SECRET}/nowy/mecz`);
  // filter: Next dokłada własny `role="alert"` (route announcer), więc samo getByRole('alert') jest niejednoznaczne.
  const alert = page.getByRole('alert').filter({ hasText: 'Najpierw wybierz swoje imię' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('link', { name: 'Kanał Klubu' })).toHaveAttribute('href', `/t/${SECRET}`);
  await expect(page.getByLabel('Rywal', { exact: true })).toBeVisible(); // formularz zostaje na miejscu
});
