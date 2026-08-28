export const HASHTAGS = '#UKSBanino #GminaŻukowo #RazemTworzymyHistorię';
export const PARTNER_FOOTER = 'Klub uczestniczy w Programie wspierania klubów sportowych KLUB PRO 2026.\nDofinansowanie: Ministerstwo Sportu i Turystyki oraz Fundacja LOTTO im. Haliny Konopackiej.';
const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu;

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
