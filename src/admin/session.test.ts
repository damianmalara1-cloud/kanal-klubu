import { describe, it, expect } from 'vitest';
import { adminEnabled, makeSession, verifySession, SESSION_DAYS } from './session';

const PW = 'haslo-admina-123';
const DAY = 86_400_000;

describe('sesja admina', () => {
  it('świeża sesja jest ważna, ciasteczko na 30 dni', () => {
    const s = makeSession(PW, 1_000);
    expect(verifySession(PW, s.value, 2_000)).toBe(true);
    expect(s.maxAge).toBe(SESSION_DAYS * 86_400);
  });

  it('wygasła sesja', () => {
    const s = makeSession(PW, 0);
    expect(verifySession(PW, s.value, SESSION_DAYS * DAY - 1)).toBe(true);
    expect(verifySession(PW, s.value, SESSION_DAYS * DAY + 1)).toBe(false);
  });

  it('podrobiony podpis albo przestawione exp', () => {
    const s = makeSession(PW, 0);
    const [exp, sig] = s.value.split('.');
    expect(verifySession(PW, `${Number(exp) + 1}.${sig}`, 1)).toBe(false);
    expect(verifySession(PW, `${exp}.${'A'.repeat(43)}`, 1)).toBe(false);
  });

  it('zmiana hasła unieważnia wszystkie sesje', () => {
    const s = makeSession(PW, 0);
    expect(verifySession('inne-haslo-admina', s.value, 1)).toBe(false);
  });

  it('brak / zły format ciasteczka', () => {
    expect(verifySession(PW, undefined, 1)).toBe(false);
    expect(verifySession(PW, '', 1)).toBe(false);
    expect(verifySession(PW, 'abc', 1)).toBe(false);
    expect(verifySession(PW, '123.abc', 1)).toBe(false);
  });

  it('panel wyłączony przy haśle pustym lub krótszym niż 12 znaków — nawet poprawnie podpisana sesja nie przechodzi', () => {
    expect(adminEnabled('')).toBe(false);
    expect(adminEnabled('krotkie')).toBe(false);
    expect(adminEnabled(PW)).toBe(true);
    const s = makeSession('krotkie', 0);
    expect(verifySession('krotkie', s.value, 1)).toBe(false);
  });
});
