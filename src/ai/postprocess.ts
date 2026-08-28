export const HASHTAGS = '#UKSBanino #GminaŻukowo #RazemTworzymyHistorię';
export const PARTNER_FOOTER = 'Klub uczestniczy w Programie wspierania klubów sportowych KLUB PRO 2026.\nDofinansowanie: Ministerstwo Sportu i Turystyki oraz Fundacja LOTTO im. Haliny Konopackiej.';

// Baza: emoji z domyślną prezentacją graficzną LUB piktogram wymuszony selektorem VS16 (U+FE0F), plus opcjonalny modyfikator odcienia skóry.
// Flagi (para Regional_Indicator) i keycapy (cyfra/#/* + opcjonalny VS16 + combining enclosing keycap U+20E3) liczone osobno jako całe jednostki.
// Sekwencje ZWJ (U+200D, np. zawód + odcień skóry) łapane jako jeden atomowy match, żeby capEmoji nie zostawiał sierot i nie liczył ich podwójnie.
const EMOJI = /\p{Regional_Indicator}\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)\p{Emoji_Modifier}?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)\p{Emoji_Modifier}?)*/gu;

export function capEmoji(text: string, max: number): string {
  let n = 0;
  return text.replace(EMOJI, (m) => (++n <= max ? m : '')).replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n');
}
export function cleanCaption(text: string): string {
  return capEmoji(text, 2)
    .replace(/!{2,}/g, '!')
    .split('\n').map((l) => l.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '').trimEnd()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}
export function finalizeCaption(caption: string, opts: { partnerInfo: boolean }): string {
  const parts = [caption.trim(), HASHTAGS]; if (opts.partnerInfo) parts.push(PARTNER_FOOTER);
  return parts.join('\n\n');
}
