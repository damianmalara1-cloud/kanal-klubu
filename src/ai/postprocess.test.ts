import { describe, it, expect } from 'vitest';
import { capEmoji, cleanCaption, finalizeCaption, HASHTAGS, PARTNER_FOOTER } from './postprocess';
describe('postprocess', () => {
  it('capEmoji zostawia 2 pierwsze', () => expect(capEmoji('a 🫡 b 🏆 c 🔥 d', 2)).toBe('a 🫡 b 🏆 c d'));
  it('cleanCaption: !! → !, hashtagi wycięte, trim', () => {
    expect(cleanCaption('Brawo!!! Tak!\n#UKSBanino #x\n')).toBe('Brawo! Tak!');
  });
  it('finalizeCaption dokleja hashtagi i opcjonalnie stopkę', () => {
    expect(finalizeCaption('Tekst', { partnerInfo: false })).toBe(`Tekst\n\n${HASHTAGS}`);
    expect(finalizeCaption('Tekst', { partnerInfo: true })).toBe(`Tekst\n\n${HASHTAGS}\n\n${PARTNER_FOOTER}`);
  });
});
