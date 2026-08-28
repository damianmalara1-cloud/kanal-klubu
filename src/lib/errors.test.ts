import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { AppError, actionFail } from './errors';
import { log } from './log';

describe('actionFail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AppError → jego własny komunikat', () => {
    expect(actionFail(new AppError('Zgłoszenie nie istnieje', 409))).toEqual({ error: 'Zgłoszenie nie istnieje' });
  });

  it('ZodError → czytelny komunikat z nazwą pola', () => {
    const result = z.object({ opponent: z.string().min(1) }).safeParse({ opponent: '' });
    expect(result.success).toBe(false);
    const out = actionFail(result.error!);
    expect(out.error).toContain('opponent');
  });

  it('inny błąd → ogólny polski komunikat, zalogowany raz przez log.error (bez zaśmiecania stderr)', () => {
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    const out = actionFail(new Error('boom — nieoczekiwany błąd'));
    expect(out).toEqual({ error: 'Coś poszło nie tak. Spróbuj jeszcze raz.' });
    expect(errSpy).toHaveBeenCalledOnce();
  });
});
