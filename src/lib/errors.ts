import { ZodError } from 'zod';
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

/** Mapuje dowolny błąd z warstwy workflow na wynik server action `{ error }`: `AppError` → jego komunikat,
 * `ZodError` → czytelny polski komunikat walidacji, cokolwiek innego → ogólny komunikat + `log.error`
 * (nieoczekiwane błędy nie mogą zniknąć bez śladu). Współdzielony przez wszystkie server actions (T15, T18). */
export function actionFail(e: unknown): { error: string } {
  if (e instanceof AppError) return { error: e.message };
  if (e instanceof ZodError) return { error: 'Uzupełnij wymagane pola: ' + e.issues.map((i) => i.path.join('.')).join(', ') };
  log.error('action', { err: e instanceof Error ? e.message : String(e) });
  return { error: 'Coś poszło nie tak. Spróbuj jeszcze raz.' };
}
