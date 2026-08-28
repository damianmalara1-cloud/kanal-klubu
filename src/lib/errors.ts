import { ZodError, core } from 'zod';
import { FIELD_HINT, FIELD_LABEL } from '@/domain/forms';
import { log } from './log';

/** Bezpieczne wyciągnięcie komunikatu z nieznanego błędu — współdzielone przez logowanie w API routes (T13). */
export const errMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Błąd domenowy z kodem HTTP dla warstwy API/akcji (400 walidacja, 403/404 dostęp, 409 zły stan, 413 za duży upload, 429 limit). */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Czy issue znaczy „pole puste / nieprzysłane" (a nie „wartość zła"). Brak pola to `invalid_type`
 * (`undefined`, dla liczb `NaN` po `coerce`), pusty tekst i pusta lista to `too_small` z minimum 1 na
 * stringu/tablicy. `too_small` na LICZBIE (np. wynik −1) to już zła wartość, nie brak. */
const isMissing = (i: core.$ZodIssue): boolean =>
  i.code === 'invalid_type' ||
  (i.code === 'too_small' && (i.origin === 'string' || i.origin === 'array') && Number(i.minimum) === 1);

const fieldOf = (i: core.$ZodIssue): string => String(i.path[0] ?? '');
const labelOf = (i: core.$ZodIssue): string => FIELD_LABEL[fieldOf(i)] ?? (i.path.join('.') || 'formularz');

/** Etykieta + granica, jeśli da się ją podać: dla bramek pełny zakres z `FIELD_HINT`, dla tekstu limit
 * długości z samego issue. Braki idą bez podpowiedzi — tam nie ma czego doprecyzowywać. */
function describe(i: core.$ZodIssue): string {
  const label = labelOf(i);
  if (isMissing(i)) return label;
  const hint = FIELD_HINT[fieldOf(i)];
  if (hint) return `${label} (${hint})`;
  if (i.code === 'too_big' && i.origin === 'string') return `${label} (do ${i.maximum} znaków)`;
  return label;
}

/** Mapuje dowolny błąd z warstwy workflow na wynik server action `{ error }`: `AppError` → jego komunikat,
 * `ZodError` → polski komunikat walidacji z etykietami pól z formularza (nigdy z nazwami technicznymi),
 * cokolwiek innego → ogólny komunikat + `log.error` (nieoczekiwane błędy nie mogą zniknąć bez śladu).
 * Prefiks zależy od tego, co się stało: same braki → „Uzupełnij wymagane pola", cokolwiek innego (wartość
 * spoza zakresu, za długi tekst) → „Sprawdź pola" — inaczej trener szuka pustego pola, które jest wypełnione. */
export function actionFail(e: unknown): { error: string } {
  if (e instanceof AppError) return { error: e.message };
  if (e instanceof ZodError) {
    const prefix = e.issues.every(isMissing) ? 'Uzupełnij wymagane pola: ' : 'Sprawdź pola: ';
    return { error: prefix + [...new Set(e.issues.map(describe))].join(', ') };
  }
  log.error('action', { err: e instanceof Error ? e.message : String(e) });
  return { error: 'Coś poszło nie tak. Spróbuj jeszcze raz.' };
}
