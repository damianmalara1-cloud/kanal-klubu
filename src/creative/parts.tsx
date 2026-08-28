import type { CSSProperties, ReactNode } from 'react';
import { assetDataUri } from './assets';

export const M = 65;
export const SLANT_DEG = 10; // token DS --angle-slant — jeden kąt w całym systemie
export const SLANT_DROP = Math.round(1080 * Math.tan((SLANT_DEG * Math.PI) / 180)); // 190 px spadku linii cięcia na szerokości planszy
export const INK = '#0D0D0D', RED = '#C12E26', RED_TEXT = '#A32219', MUTED = '#8A8A8A', WHITE = '#FFFFFF';
export const FONT_DISPLAY = 'Anton', FONT_TEXT = 'Barlow';
export const upperPl = (s: string) => s.toLocaleUpperCase('pl-PL');

export function Canvas({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: WHITE,
        color: INK,
        fontFamily: FONT_TEXT,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

export function Logo({ white = false, top = 58 }: { white?: boolean; top?: number }) {
  return (
    <img
      src={assetDataUri(white ? 'logo/uks-banino-logo-mono-white.svg' : 'logo/uks-banino-logo-primary.svg')}
      width={200}
      height={139}
      style={{ position: 'absolute', left: M, top }}
    />
  );
}

export function Kicker({ children, color = RED_TEXT, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: FONT_TEXT,
        fontWeight: 600,
        fontSize: 20,
        lineHeight: 1.5,
        letterSpacing: 2.8,
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function RedBar({ width = 110, style }: { width?: number; style?: CSSProperties }) {
  return <div style={{ width, height: 12, background: RED, ...style }} />;
}

/**
 * Wiersz „czerwony pasek + tekst” — powtarzający się układ w turniej.tsx, sukces.tsx i ogloszenie.tsx.
 * Szerokość tekstu liczy się sama (950 − barWidth − 24), żeby nie duplikować tej arytmetyki (i nie
 * rozjeżdżać jej) w każdym szablonie z osobna. `textStyle` niesie stylowanie typograficzne właściwe
 * danemu wywołaniu (fontSize/fontWeight/uppercase itd.), `style` nadpisuje wiersz (np. marginTop).
 */
export function BarRow({
  children,
  barWidth = 110,
  textStyle,
  style,
}: {
  children: ReactNode;
  barWidth?: number;
  textStyle?: CSSProperties;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', ...style }}>
      <RedBar width={barWidth} style={{ flexShrink: 0 }} />
      <div style={{ display: 'flex', marginLeft: 24, width: 950 - barWidth - 24, wordBreak: 'break-word', ...textStyle }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Zdjęcie od góry na pełną szerokość; dolna krawędź cięta białym klinem pod stałym kątem SLANT_DEG.
 * Kierunek zgodny z tokenami DS (`--slant-clip-down` / `--slant-skew: skewY(-10deg)`): linia cięcia
 * opada w LEWO — lewa krawędź zdjęcia sięga pełnego `height` (punkt najniższy), prawa krawędź jest
 * cięta o SLANT_DROP px wyżej. Klin to prostokąt zaczepiony w (0, height) i obrócony o `-SLANT_DEG`
 * wokół tego rogu. Satori honoruje `transformOrigin` WYŁĄCZNIE jako słowo kluczowe (np. `'left top'`)
 * — wartości `'0 0'` / `'0px 0px'` / `'0% 0%'` są po cichu ignorowane i obrót leci wokół środka.
 */
export function PhotoTop({ src, height }: { src: string; height: number }) {
  const angle = SLANT_DEG;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: height + 20, display: 'flex' }}>
      <img src={src} width={1080} height={height} style={{ position: 'absolute', left: 0, top: 0, objectFit: 'cover' }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1080,
          height: 220,
          background: 'linear-gradient(to bottom, rgba(13,13,13,0.55), rgba(13,13,13,0))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: height,
          width: 1500,
          height: 600,
          background: WHITE,
          transform: `rotate(-${angle}deg)`,
          transformOrigin: 'left top',
        }}
      />
    </div>
  );
}

/** Ciemny pas 1230–1350 z białymi logotypami (KLUB PRO + zestaw Fundacji/MSiT). */
export function PartnerBand() {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 1230,
        width: 1080,
        height: 120,
        background: INK,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: M,
        gap: 40,
      }}
    >
      <img src={assetDataUri('partnerzy/klub-pro-white.png')} width={163} height={52} />
      <img src={assetDataUri('partnerzy/fundacja-msit-set-white.png')} width={352} height={52} />
    </div>
  );
}

/** Blok „etykieta / wartość” z linią 2 px — do siatek informacyjnych. */
export function DataCell({ label, value, width, big = 34 }: { label: string; value: string; width: number; big?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width, borderTop: `2px solid ${INK}`, paddingTop: 12 }}>
      <div
        style={{
          display: 'flex',
          fontWeight: 600,
          fontSize: 17,
          letterSpacing: 2.4,
          textTransform: 'uppercase',
          color: RED_TEXT,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', fontWeight: 600, fontSize: big, lineHeight: 1.2, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
