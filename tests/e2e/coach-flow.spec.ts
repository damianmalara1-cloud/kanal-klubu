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
