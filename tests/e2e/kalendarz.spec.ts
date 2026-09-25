import { test, expect } from '@playwright/test';
const SECRET = 'test-secret-1234567890';
const CAL = `/t/${SECRET}/kalendarz`;

test('kalendarz: seria → odwołanie terminu + Cofnij → zmiana „ten i następne" → usunięcie → .ics → kosz w panelu', async ({ page, request }) => {
  await page.goto(`/t/${SECRET}`);
  await page.getByRole('button', { name: 'Ania' }).click();
  await page.getByRole('link', { name: 'Kalendarz' }).click();
  await expect(page.getByRole('heading', { name: 'Kalendarz' })).toBeVisible();

  // seria wt+czw od 29.09.2026 do 15.10.2026 → 6 terminów
  await page.goto(`${CAL}/nowy?date=2026-09-29&type=trening`);
  await page.getByRole('button', { name: 'młodziczki (2011+)' }).click(); // chipy drużyn (można kilka)
  await page.getByRole('button', { name: 'Ania', exact: true }).click(); // chips trenera w formularzu
  await page.getByLabel('Co tydzień').check();
  await page.getByRole('button', { name: 'czw' }).click();
  await page.getByLabel('Do').fill('2026-10-15');
  await expect(page.getByText(/Utworzy 6 terminów/)).toBeVisible();
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/kalendarz\?d=2026-09-29/);
  await expect(page.getByRole('link', { name: /Trening · Ania/ })).toHaveCount(2); // wt 29.09 + czw 01.10

  // odwołaj czwartek 01.10 → Cofnij → wraca
  await page.getByRole('link', { name: /Trening · Ania/ }).nth(1).click();
  await page.getByRole('button', { name: 'Usuń' }).click();
  await page.getByRole('button', { name: 'Na pewno? Usuń' }).click();
  await page.getByRole('button', { name: 'Tylko ten termin' }).click();
  await expect(page.getByRole('status')).toContainText('Usunięto');
  await page.getByRole('button', { name: 'Cofnij' }).click();
  await page.goto(`${CAL}?d=2026-09-29`);
  await expect(page.getByRole('link', { name: /Trening · Ania/ })).toHaveCount(2);

  // zmiana godziny od 06.10 w górę
  await page.goto(`${CAL}?d=2026-10-06`);
  await page.getByRole('link', { name: /Trening · Ania/ }).first().click();
  await page.getByRole('button', { name: 'Edytuj' }).click();
  await page.getByLabel('Początek').fill('17:00');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await page.getByRole('button', { name: 'Ten i wszystkie następne' }).click();
  await expect(page).toHaveURL(/d=2026-10-06/);
  await expect(page.locator('.cal-when', { hasText: '17:00–18:00' })).toHaveCount(2);
  await page.goto(`${CAL}?d=2026-09-29`);
  await expect(page.locator('.cal-when', { hasText: '16:30–18:00' })).toHaveCount(2);

  // mecz → usunięcie → .ics bez meczu, z treningami
  // mecz dwóch drużyn naraz: karta ma odznakę każdej
  await page.goto(`${CAL}/nowy?date=2026-10-10&type=mecz`);
  await page.getByRole('button', { name: 'młodziczki (2011+)' }).click();
  await page.getByRole('button', { name: 'młodzicy (2011+)' }).click();
  await page.getByLabel('Rywal', { exact: true }).fill('Sokół');
  await page.getByLabel('Początek').fill('10:00');
  await page.getByLabel('Koniec').fill('12:00');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByRole('link', { name: /vs Sokół/ }).locator('.cal-team')).toHaveText(['młodziczki (2011+)', 'młodzicy (2011+)']);
  const two = await (await request.get(`/api/ics/${SECRET}/mlodzicy-2011.ics`)).text();
  expect(two).toContain('SUMMARY:młodziczki (2011+) + młodzicy (2011+) · Mecz · vs Sokół');
  await page.getByRole('link', { name: /vs Sokół/ }).click();
  const url = page.url();
  await page.getByRole('button', { name: 'Usuń' }).click();
  await page.getByRole('button', { name: 'Na pewno? Usuń' }).click();
  await expect(page.getByRole('status')).toContainText('Usunięto');
  const ics = await request.get(`/api/ics/${SECRET}/klub.ics`);
  expect(ics.status()).toBe(200);
  const body = await ics.text();
  expect(body).toContain('SUMMARY:młodziczki (2011+) · Trening · Ania');
  expect(body).not.toContain('vs Sokół');
  expect(body).toContain('DTSTART;TZID=Europe/Warsaw:20261006T170000');

  // panel: kosz pokazuje mecz, Przywróć działa; oś zdarzeń ma wpisy kalendarza
  await page.goto('/admin');
  await page.getByLabel('Hasło').fill('test-admin-password-123');
  await page.getByRole('button', { name: 'Zaloguj' }).click();
  await page.getByRole('link', { name: 'Kosz kalendarza' }).click();
  // `getByText('vs Sokół')` gołe jest niejednoznaczne w trakcie przejścia klienckiego z `/admin` (URL zmienia
  // się dopiero po chwili) — ta sama fraza żyje też w osi zdarzeń dashboardu („Dodanie:"/„Usunięcie: mecz …
  // vs Sokół"), więc `toBeVisible()` łapie 2 dopasowania i przestaje się doczekiwać (strict mode violation nie
  // jest retry'owany jak zwykłe „jeszcze niewidoczne"). Wiersz tabeli kosza jest jednoznaczny na obu stronach.
  await expect(page.getByRole('row', { name: /vs Sokół/ })).toBeVisible();
  await page.getByRole('button', { name: 'Przywróć', exact: true }).click();
  await expect(page.getByText('Kosz jest pusty.')).toBeVisible();
  await page.goto('/admin');
  await page.getByRole('link', { name: 'Kalendarz: seria' }).click();
  await expect(page.getByText(/Dodanie serii 6 treningów/)).toBeVisible();
  void url;
});
