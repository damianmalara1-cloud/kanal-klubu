import { describe, it, expect } from 'vitest';
import { capEmoji, cleanCaption, finalizeCaption, HASHTAGS, PARTNER_FOOTER } from './postprocess';
describe('postprocess', () => {
  it('capEmoji zostawia 2 pierwsze', () => expect(capEmoji('a 🫡 b 🏆 c 🔥 d', 2)).toBe('a 🫡 b 🏆 c d'));
  it('capEmoji: modyfikator odcienia skóry usuwany razem z bazą, bez sieroty', () => {
    expect(capEmoji('a 👍 b 🏆 c 👍🏽 d', 2)).toBe('a 👍 b 🏆 c d');
  });
  it('capEmoji: sekwencja ZWJ (zawód + odcień skóry) liczona jako jeden emoji', () => {
    expect(capEmoji('👨🏽‍💻 x 🔥 y 😊', 2)).toBe('👨🏽‍💻 x 🔥 y ');
  });
  it('capEmoji: flaga (para Regional Indicator) liczona jako jeden emoji', () => {
    expect(capEmoji('a 👍 b 🏆 c 🇵🇱 d', 2)).toBe('a 👍 b 🏆 c d');
  });
  it('capEmoji: © nie jest liczony jako emoji', () => {
    expect(capEmoji('Klub © 2026 👍 🏆 🔥', 2)).toBe('Klub © 2026 👍 🏆 ');
  });
  it('cleanCaption: !! → !, hashtagi wycięte, trim', () => {
    expect(cleanCaption('Brawo!!! Tak!\n#UKSBanino #x\n')).toBe('Brawo! Tak!');
  });
  it('finalizeCaption dokleja hashtagi i opcjonalnie stopkę', () => {
    expect(finalizeCaption('Tekst', { partnerInfo: false })).toBe(`Tekst\n\n${HASHTAGS}`);
    expect(finalizeCaption('Tekst', { partnerInfo: true })).toBe(`Tekst\n\n${HASHTAGS}\n\n${PARTNER_FOOTER}`);
  });
});
