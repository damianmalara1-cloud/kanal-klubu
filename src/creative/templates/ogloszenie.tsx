import type { OgloszenieForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { Canvas, DataCell, Kicker, Logo, M, PartnerBand, PhotoTop, RedBar, FONT_DISPLAY, upperPl } from '../parts';

/**
 * Rozmiar wielkiego nagłówka zależny od długości (jak `resultStyle` w turniej.tsx). Nagłówek jest
 * ucinany do 40 znaków (`.slice(0, 40)` niżej), ale nawet 40 znaków Antonem w bazowym rozmiarze
 * zawijałoby się na tyle linii, że wjeżdżałby w zarezerwowaną strefę 1180–1350 (pas partnerów) —
 * skalowanie trzyma go nad strefą niezależnie od wariantu (zdjęcie ma mniejszą bazę, bo mniej
 * miejsca w pionie na treść).
 */
function headlineStyle(text: string, base: number): { size: number; lineHeight: number } {
  if (text.length <= 18) return { size: base, lineHeight: 0.92 };
  if (text.length <= 30) return { size: Math.round(base * 0.72), lineHeight: 1.0 };
  return { size: Math.round(base * 0.52), lineHeight: 1.08 };
}

export function OgloszenieCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as OgloszenieForm;
  const headlineText = upperPl(post.headline || f.title).slice(0, 40);
  const sub = upperPl(f.team || 'UKS Banino');
  const cells: [string, string][] = [];
  if (f.date) cells.push(['Kiedy', f.date]);
  if (f.time) cells.push(['Godzina', f.time]);
  if (f.place) cells.push(['Miejsce', f.place]);
  const top = photo ? 580 : 240;
  const base = photo ? 104 : 120;
  const { size, lineHeight } = headlineStyle(headlineText, base);
  return (
    <Canvas>
      {photo && <PhotoTop src={photo} height={520} />}
      <Logo white={!!photo} />
      {!photo && (
        <Kicker style={{ position: 'absolute', left: 500, top: 64, width: 515, justifyContent: 'flex-end', lineHeight: 1 }}>
          {post.kicker || 'Ogłoszenie'}
        </Kicker>
      )}
      <div style={{ position: 'absolute', left: M, top, width: 950, display: 'flex', flexDirection: 'column' }}>
        {photo && <Kicker>{post.kicker || 'Ogłoszenie'}</Kicker>}
        <div
          style={{
            display: 'flex',
            marginTop: photo ? 20 : 0,
            width: 950,
            fontFamily: FONT_DISPLAY,
            fontSize: size,
            lineHeight,
            letterSpacing: -size * 0.015,
            wordBreak: 'break-word',
          }}
        >
          {headlineText}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 30 }}>
          <RedBar />
          <div
            style={{
              display: 'flex',
              marginLeft: 22,
              width: 818,
              fontWeight: 600,
              fontSize: 24,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              wordBreak: 'break-word',
            }}
          >
            {sub}
          </div>
        </div>
        {cells.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 60, gap: 26 }}>
            {cells.map(([label, value]) => (
              <DataCell key={label} label={label} value={value} width={462} />
            ))}
          </div>
        )}
      </div>
      {partnerBand && <PartnerBand />}
    </Canvas>
  );
}
