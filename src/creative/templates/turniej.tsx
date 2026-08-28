import type { TurniejForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { Canvas, Kicker, Logo, M, MUTED, PartnerBand, PhotoTop, RedBar, FONT_DISPLAY, upperPl } from '../parts';

export function TurniejCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as TurniejForm;
  const kicker = post.kicker || 'Turniej';
  const big = upperPl(f.result || post.headline || 'Turniej');
  const meta = [f.place, f.team].filter(Boolean).join(' · ');
  const top = photo ? 660 : 300,
    bigSize = photo ? 104 : 138;
  return (
    <Canvas>
      {photo && <PhotoTop src={photo} height={600} />}
      <Logo white={!!photo} />
      <div style={{ position: 'absolute', left: M, top, width: 950, display: 'flex', flexDirection: 'column' }}>
        <Kicker>{kicker}</Kicker>
        <div style={{ display: 'flex', marginTop: 28, fontFamily: FONT_DISPLAY, fontSize: bigSize, lineHeight: 0.9, letterSpacing: -bigSize * 0.015 }}>
          {big}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 34 }}>
          <RedBar />
          <div style={{ display: 'flex', marginLeft: 24, fontWeight: 600, fontSize: photo ? 36 : 40, lineHeight: 1.15, width: 800 }}>{f.name}</div>
        </div>
        {meta && (
          <div style={{ display: 'flex', marginTop: 30, fontWeight: 600, fontSize: 28, color: MUTED }}>{meta}</div>
        )}
      </div>
      {partnerBand && <PartnerBand />}
    </Canvas>
  );
}
