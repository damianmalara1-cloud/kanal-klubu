import type { MeczForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { Canvas, Kicker, Logo, M, MUTED, PartnerBand, PhotoTop, RED, FONT_DISPLAY, INK, WHITE } from '../parts';

function Score({ home, away, size }: { home: number; away: number; size: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', fontFamily: FONT_DISPLAY, fontSize: size, lineHeight: 0.86, letterSpacing: -size * 0.02 }}>
      <span>{home}</span>
      <span style={{ fontSize: size * 0.66, color: RED, marginLeft: 24, marginRight: 24 }}>:</span>
      <span>{away}</span>
    </div>
  );
}

/**
 * Rozmiar czcionki nazw drużyn zależny od długości dłuższej z dwóch (ustalenie po review Task 8):
 * do 30 znaków — rozmiar bazowy (36), powyżej (do limitu schematu — 48 znaków, `forms.ts`) — 30,
 * żeby długi rywal przy zawinięciu w dwie linie nie wjeżdżał w zarezerwowaną strefę 1180–1350 (pas
 * partnerów).
 */
function teamFontSize(home: string, opponent: string): number {
  return Math.max(home.length, opponent.length) <= 30 ? 36 : 30;
}

function Teams({ opponent, size }: { opponent: string; size: number }) {
  // wordBreak: nazwa bez spacji (np. literówka bez odstępów) nie może uciec poza szerokość 455px i wyjechać poza planszę.
  return (
    <div style={{ display: 'flex', borderTop: `2px solid ${INK}`, paddingTop: 22, marginTop: 36 }}>
      <div style={{ display: 'flex', width: 455, fontWeight: 600, fontSize: size, lineHeight: 1.15, wordBreak: 'break-word' }}>UKS Banino</div>
      <div style={{ display: 'flex', width: 455, marginLeft: 40, fontWeight: 600, fontSize: size, lineHeight: 1.15, wordBreak: 'break-word' }}>
        {opponent}
      </div>
    </div>
  );
}

/** Etykieta miejsca meczu (dom/wyjazd) w prawym górnym rogu — ten sam styl w obu wariantach, biały na zdjęciu. */
function VenueLabel({ children, white }: { children: string; white?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 500,
        top: 64,
        width: 515,
        display: 'flex',
        justifyContent: 'flex-end',
        fontWeight: 600,
        fontSize: 20,
        letterSpacing: 2.8,
        textTransform: 'uppercase',
        color: white ? WHITE : MUTED,
        textAlign: 'right',
      }}
    >
      {children}
    </div>
  );
}

export function MeczCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as MeczForm;
  const kicker = post.kicker || `Wynik meczu${f.team ? ` · ${f.team}` : ''}`;
  const where = f.venue === 'dom' ? 'Banino' : `wyjazd${f.venueCity ? ` · ${f.venueCity}` : ''}`;
  const teamSize = teamFontSize('UKS Banino', f.opponent);
  if (photo) {
    return (
      <Canvas>
        <PhotoTop src={photo} height={700} />
        <Logo white />
        <VenueLabel white>{where}</VenueLabel>
        <div style={{ position: 'absolute', left: M, top: 770, width: 950, display: 'flex', flexDirection: 'column' }}>
          <Kicker>{kicker}</Kicker>
          <div style={{ display: 'flex', marginTop: 28 }}>
            <Score home={f.scoreHome} away={f.scoreAway} size={200} />
          </div>
          <Teams opponent={f.opponent} size={teamSize} />
        </div>
        {partnerBand && <PartnerBand />}
      </Canvas>
    );
  }
  return (
    <Canvas>
      <Logo />
      <VenueLabel>{where}</VenueLabel>
      <div style={{ position: 'absolute', left: M, top: 330, width: 950, display: 'flex', flexDirection: 'column' }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ display: 'flex', marginTop: 40 }}>
          <Score home={f.scoreHome} away={f.scoreAway} size={300} />
        </div>
        <Teams opponent={f.opponent} size={teamSize} />
      </div>
      {partnerBand && <PartnerBand />}
    </Canvas>
  );
}
