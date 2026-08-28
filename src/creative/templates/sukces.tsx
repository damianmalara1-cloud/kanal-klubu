import type { SukcesForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { BarRow, Canvas, Kicker, Logo, M, MUTED, PartnerBand, PhotoTop, FONT_DISPLAY, upperPl } from '../parts';

const KIND_LABEL: Record<SukcesForm['kind'], string> = {
  kadra: 'Powołanie do kadry',
  medal: 'Medal',
  wyroznienie: 'Wyróżnienie',
  inne: 'Sukces',
};

/**
 * Nazwiska są bohaterem planszy (Barlow 600, nigdy Anton) — każde w osobnej linii. Baza zależy od
 * liczby nazwisk (1 → 84px, 2 → 72px, 3 → 60px), dodatkowo obniżona, gdy najdłuższe nazwisko
 * przekracza 24 znaki — bez tego 3 nazwiska × 40 znaków (limit `forms.ts`) łamałyby się na tyle
 * linii, że wjeżdżałyby w zarezerwowaną strefę 1180–1350 (pas partnerów).
 */
function namesStyle(names: string[]): { fontSize: number; lineHeight: number } {
  const base = names.length <= 1 ? 84 : names.length === 2 ? 72 : 60;
  const longest = Math.max(...names.map((n) => n.length));
  const fontSize = longest > 24 ? Math.round(base * 0.6) : base;
  return { fontSize, lineHeight: 1.05 };
}

/**
 * Nagłówek (np. „Powołanie do kadry”) jest DRUGORZĘDNY względem nazwisk — Anton, max 64px, w wierszu
 * z czerwonym paskiem (`BarRow`) pod listą nazwisk. Ucięty do 40 znaków, dalej skalowany jak
 * `resultStyle` w turniej.tsx: krótkie (≤20 znaków) idą kapitalikami, dłuższe zwykłą wielkością liter
 * z rosnącym `lineHeight`, żeby nie wjechał w pas partnerów nawet przy maksymalnej długości.
 */
function headlineStyle(raw: string): { text: string; size: number; lineHeight: number } {
  const s = raw.slice(0, 40).trim();
  if (s.length <= 20) return { text: upperPl(s), size: 64, lineHeight: 0.95 };
  if (s.length <= 30) return { text: s, size: 48, lineHeight: 1.1 };
  return { text: s, size: 36, lineHeight: 1.15 };
}

export function SukcesCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as SukcesForm;
  const names = f.names.slice(0, 3);
  const kicker = post.kicker || [KIND_LABEL[f.kind], f.team].filter(Boolean).join(' · ');
  const { fontSize: namesSize, lineHeight: namesLineHeight } = namesStyle(names);
  const { text: headText, size: headSize, lineHeight: headLineHeight } = headlineStyle(post.headline || KIND_LABEL[f.kind]);

  const names_ = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {names.map((n, i) => (
        <div
          key={`${i}-${n}`}
          style={{ display: 'flex', width: 950, fontWeight: 600, fontSize: namesSize, lineHeight: namesLineHeight, wordBreak: 'break-word' }}
        >
          {n}
        </div>
      ))}
    </div>
  );
  const headline = (
    <BarRow
      style={{ marginTop: 28 }}
      textStyle={{ fontFamily: FONT_DISPLAY, fontSize: headSize, lineHeight: headLineHeight, letterSpacing: -headSize * 0.015 }}
    >
      {headText}
    </BarRow>
  );

  if (photo) {
    return (
      <Canvas>
        <PhotoTop src={photo} height={770} />
        <Logo white />
        <div style={{ position: 'absolute', left: M, top: 830, width: 950, display: 'flex', flexDirection: 'column' }}>
          <Kicker>{kicker}</Kicker>
          <div style={{ display: 'flex', marginTop: 22 }}>{names_}</div>
          {headline}
        </div>
        {partnerBand && <PartnerBand />}
      </Canvas>
    );
  }
  return (
    <Canvas>
      <Logo />
      <div style={{ position: 'absolute', left: M, top: 330, width: 950, display: 'flex', flexDirection: 'column' }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ display: 'flex', marginTop: 28 }}>{names_}</div>
        {headline}
        {f.details && (
          <div style={{ display: 'flex', marginTop: 44, width: 900, fontSize: 22, lineHeight: 1.5, color: MUTED, wordBreak: 'break-word' }}>
            {f.details}
          </div>
        )}
      </div>
      {partnerBand && <PartnerBand />}
    </Canvas>
  );
}
