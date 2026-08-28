import type { TurniejForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { BarRow, Canvas, DataCell, Kicker, Logo, M, PartnerBand, PhotoTop, FONT_DISPLAY, upperPl } from '../parts';

/**
 * Rozmiar i wielkość liter wielkiego wyniku/miejsca — zależne od długości tekstu (ustalenie po review
 * Task 8). Krótkie wyniki (≤20 znaków, np. „2. miejsce") idą w kapitalikach Antona jak dotychczas;
 * dłuższe zdania (np. „2. miejsce w kategorii młodzików") renderują się normalną wielkością liter i
 * mniejszym rozmiarem — wersaliki + ciasny lineHeight 0.9 gubiły ogonki polskich znaków diakrytycznych
 * przy zawijaniu w wiele linii.
 */
export function resultStyle(result: string): { text: string; size: number } {
  const s = result.trim();
  if (s.length <= 20) return { text: upperPl(s), size: 138 };
  if (s.length <= 30) return { text: s, size: 96 };
  return { text: s, size: 72 };
}

export function TurniejCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as TurniejForm;
  const kicker = post.kicker || 'Turniej';
  const { text: big, size: bigSize } = resultStyle(f.result || post.headline || 'Turniej');
  const bigLineHeight = bigSize === 138 ? 0.9 : 1.05;
  const top = photo ? 660 : 420;
  return (
    <Canvas>
      {photo && <PhotoTop src={photo} height={600} />}
      <Logo white={!!photo} />
      <div style={{ position: 'absolute', left: M, top, width: 950, display: 'flex', flexDirection: 'column' }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ display: 'flex', marginTop: 28, fontFamily: FONT_DISPLAY, fontSize: bigSize, lineHeight: bigLineHeight, letterSpacing: -bigSize * 0.015 }}>
          {big}
        </div>
        {/* wordBreak (w BarRow): nazwa bez spacji nie może uciec poza szerokość kolumny i wyjechać poza planszę (ten sam problem naprawiony w Teams — mecz.tsx) */}
        <BarRow style={{ marginTop: 34 }} textStyle={{ fontWeight: 600, fontSize: photo ? 36 : 40, lineHeight: 1.15 }}>
          {f.name}
        </BarRow>
        {(f.place || f.team) && (
          <div style={{ display: 'flex', marginTop: 60, gap: 40 }}>
            {f.place && <DataCell label="Miejsce" value={f.place} width={455} big={40} />}
            {f.team && <DataCell label="Drużyna" value={f.team} width={455} big={40} />}
          </div>
        )}
      </div>
      {partnerBand && <PartnerBand />}
    </Canvas>
  );
}
