import type { SukcesForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { Canvas, Kicker, Logo, M, MUTED, PartnerBand, PhotoTop, RedBar, FONT_DISPLAY, upperPl } from '../parts';

const KIND_LABEL: Record<SukcesForm['kind'], string> = {
  kadra: 'Powołanie do kadry',
  medal: 'Medal',
  wyroznienie: 'Wyróżnienie',
  inne: 'Sukces',
};

/**
 * Rozmiar czcionki listy nazwisk zależny od łącznej długości (jak `resultStyle` w turniej.tsx) — do
 * 3 nazwisk × 40 znaków (limit `forms.ts`) nie może wjechać w zarezerwowaną strefę 1180–1350 (pas
 * partnerów). Nazwiska renderują się jedną linią rozdzieloną przecinkami, więc to skalowanie plus
 * `wordBreak` na kontenerze wystarcza — bez potrzeby osobnych wierszy na nazwisko.
 */
function namesStyle(names: string[]): { fontSize: number; lineHeight: number } {
  const joined = names.join(', ');
  if (joined.length <= 24) return { fontSize: 44, lineHeight: 1.15 };
  if (joined.length <= 60) return { fontSize: 34, lineHeight: 1.2 };
  return { fontSize: 26, lineHeight: 1.3 };
}

export function SukcesCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as SukcesForm;
  const names = f.names.slice(0, 3);
  const headline = upperPl(post.headline || KIND_LABEL[f.kind]);
  const kicker = post.kicker || [KIND_LABEL[f.kind], f.team].filter(Boolean).join(' · ');
  const { fontSize, lineHeight } = namesStyle(names);

  if (photo) {
    return (
      <Canvas>
        <PhotoTop src={photo} height={770} />
        <Logo white />
        <div style={{ position: 'absolute', left: M, top: 830, width: 950, display: 'flex', flexDirection: 'column' }}>
          <Kicker>{kicker}</Kicker>
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              width: 950,
              fontFamily: FONT_DISPLAY,
              fontSize: 88,
              lineHeight: 0.92,
              letterSpacing: -1,
              wordBreak: 'break-word',
            }}
          >
            {headline}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 26 }}>
            <RedBar width={90} style={{ marginTop: 12, flexShrink: 0 }} />
            <div style={{ display: 'flex', marginLeft: 24, width: 836, fontWeight: 600, fontSize, lineHeight, wordBreak: 'break-word' }}>
              {names.join(', ')}
            </div>
          </div>
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
        <div
          style={{
            display: 'flex',
            marginTop: 30,
            width: 950,
            fontFamily: FONT_DISPLAY,
            fontSize: 96,
            lineHeight: 0.92,
            letterSpacing: -1,
            wordBreak: 'break-word',
          }}
        >
          {headline}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 34 }}>
          <RedBar style={{ marginTop: 14, flexShrink: 0 }} />
          <div style={{ display: 'flex', marginLeft: 24, width: 816, fontWeight: 600, fontSize, lineHeight, wordBreak: 'break-word' }}>
            {names.join(', ')}
          </div>
        </div>
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
