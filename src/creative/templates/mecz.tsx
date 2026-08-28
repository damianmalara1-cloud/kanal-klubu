import type { MeczForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { Canvas, Kicker, Logo, M, MUTED, PartnerBand, PhotoTop, RED, FONT_DISPLAY, INK } from '../parts';

function Score({ home, away, size }: { home: number; away: number; size: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', fontFamily: FONT_DISPLAY, fontSize: size, lineHeight: 0.86, letterSpacing: -size * 0.02 }}>
      <span>{home}</span>
      <span style={{ fontSize: size * 0.66, color: RED, marginLeft: 24, marginRight: 24 }}>:</span>
      <span>{away}</span>
    </div>
  );
}
function Teams({ opponent, size }: { opponent: string; size: number }) {
  return (
    <div style={{ display: 'flex', borderTop: `2px solid ${INK}`, paddingTop: 22, marginTop: 36 }}>
      <div style={{ display: 'flex', width: 455, fontWeight: 600, fontSize: size, lineHeight: 1.15 }}>UKS Banino</div>
      <div style={{ display: 'flex', width: 455, marginLeft: 40, fontWeight: 600, fontSize: size, lineHeight: 1.15 }}>{opponent}</div>
    </div>
  );
}

export function MeczCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as MeczForm;
  const kicker = post.kicker || `Wynik meczu${f.team ? ` · ${f.team}` : ''}`;
  const where = f.venue === 'dom' ? 'Banino' : `wyjazd${f.venueCity ? ` · ${f.venueCity}` : ''}`;
  if (photo) {
    return (
      <Canvas>
        <PhotoTop src={photo} height={700} />
        <Logo white />
        <div style={{ position: 'absolute', left: M, top: 770, width: 950, display: 'flex', flexDirection: 'column' }}>
          <Kicker>{kicker}</Kicker>
          <div style={{ display: 'flex', marginTop: 28 }}>
            <Score home={f.scoreHome} away={f.scoreAway} size={200} />
          </div>
          <Teams opponent={f.opponent} size={36} />
        </div>
        {partnerBand && <PartnerBand />}
      </Canvas>
    );
  }
  return (
    <Canvas>
      <Logo />
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
          color: MUTED,
          textAlign: 'right',
        }}
      >
        {where}
      </div>
      <div style={{ position: 'absolute', left: M, top: 330, width: 950, display: 'flex', flexDirection: 'column' }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ display: 'flex', marginTop: 40 }}>
          <Score home={f.scoreHome} away={f.scoreAway} size={300} />
        </div>
        <Teams opponent={f.opponent} size={36} />
      </div>
      <div style={{ position: 'absolute', left: M, top: 1080, width: 700, display: 'flex', fontSize: 18, lineHeight: 1.5, color: MUTED }}>
        Wynik podajemy zawsze w tym samym układzie.
      </div>
      {partnerBand && <PartnerBand />}
    </Canvas>
  );
}
