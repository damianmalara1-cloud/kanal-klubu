import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { AppError, actionFail } from './errors';
import { parseForm } from '@/domain/forms';
import { log } from './log';

describe('actionFail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AppError → jego własny komunikat', () => {
    expect(actionFail(new AppError('Zgłoszenie nie istnieje', 409))).toEqual({ error: 'Zgłoszenie nie istnieje' });
  });

  it('ZodError → czytelny komunikat z etykietą pola z formularza, nie nazwą techniczną', () => {
    const result = z.object({ opponent: z.string().min(1) }).safeParse({ opponent: '' });
    expect(result.success).toBe(false);
    const out = actionFail(result.error!);
    expect(out.error).toContain('Rywal');
    expect(out.error).not.toContain('opponent');
  });

  // Trener nie ma słownika `scoreHome` → „Bramki UKS Banino", a UAT (D-04) pokazał komunikat
  // „Uzupełnij wymagane pola: scoreHome" przy polu WYPEŁNIONYM wartością spoza zakresu.
  const zodErrorOf = (raw: unknown) => {
    try {
      parseForm('mecz', raw);
    } catch (e) {
      return e;
    }
    throw new Error('parseForm miał rzucić, a przeszedł');
  };

  it('same braki → „Uzupełnij wymagane pola" z etykietami', () => {
    const out = actionFail(zodErrorOf({ team: 'młodziczki (2011+)', opponent: '' }));
    expect(out).toEqual({ error: 'Uzupełnij wymagane pola: Rywal, Bramki UKS Banino, Bramki rywala' });
  });

  it('wartość spoza zakresu → „Sprawdź pola" z zakresem, nie „Uzupełnij"', () => {
    const out = actionFail(zodErrorOf({ team: 'młodziczki (2011+)', opponent: 'Sokół', scoreHome: '250', scoreAway: '18' }));
    expect(out).toEqual({ error: 'Sprawdź pola: Bramki UKS Banino (0–199)' });
  });

  it('brak i zła wartość naraz → prefiks „Sprawdź pola", oba pola wymienione', () => {
    const out = actionFail(zodErrorOf({ team: 'młodziczki (2011+)', opponent: '', scoreHome: '250', scoreAway: '18' }));
    expect(out).toEqual({ error: 'Sprawdź pola: Rywal, Bramki UKS Banino (0–199)' });
  });

  it('za długi tekst → etykieta z limitem znaków', () => {
    const out = actionFail(zodErrorOf({ team: 'młodziczki (2011+)', opponent: 'A'.repeat(49), scoreHome: '1', scoreAway: '2' }));
    expect(out).toEqual({ error: 'Sprawdź pola: Rywal (do 48 znaków)' });
  });

  it('inny błąd → ogólny polski komunikat, zalogowany raz przez log.error (bez zaśmiecania stderr)', () => {
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    const out = actionFail(new Error('boom — nieoczekiwany błąd'));
    expect(out).toEqual({ error: 'Coś poszło nie tak. Spróbuj jeszcze raz.' });
    expect(errSpy).toHaveBeenCalledOnce();
  });
});
