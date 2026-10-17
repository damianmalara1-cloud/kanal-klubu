'use client';
import { useState } from 'react';
import { photoRect, SLANT_DROP } from '@/creative/geometry';
import type { PhotoCrop, PhotoStyle } from '@/domain/types';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * Plansza z serwera + nakładka odtwarzająca w przeglądarce pole zdjęcia dla bieżącego kadru. Nakładka jest
 * widoczna tylko gdy plansza z serwera jeszcze nie pokazuje tego kadru (`live`) — dzięki temu klik w strzałkę
 * zmienia obraz natychmiast, a prawdziwy render dojeżdża w tle i po wczytaniu po cichu ją zastępuje.
 * Duotone „klubowe" przybliżone CSS-em (szarość × czerwień) — różnica wobec serwera jest kosmetyczna i znika
 * po dojeździe planszy. `heroSrc === null` (np. HEIC bez podglądu w przeglądarce) = sama plansza, jak wcześniej.
 */
export function LiveCreative({
  creativeUrl,
  heroSrc,
  photoHeight: h,
  label,
  crop,
  style,
  live,
  onCreativeLoad,
}: {
  creativeUrl: string;
  heroSrc: string | null;
  photoHeight: number;
  label: string | null;
  crop: PhotoCrop;
  style: PhotoStyle;
  live: boolean;
  onCreativeLoad: (url: string) => void;
}) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const r = nat ? photoRect(nat.w, nat.h, h, crop) : null;
  return (
    // containerType: rozmiary tekstu w `cqw` skalują się z szerokością planszy na ekranie (1080 px planszy = 100cqw)
    <div style={{ position: 'relative', containerType: 'inline-size' }}>
      {creativeUrl && <img className="creative" src={creativeUrl} alt="Plansza" width={1080} height={1350} onLoad={() => onCreativeLoad(creativeUrl)} />}
      {heroSrc && (
        <div
          aria-hidden
          data-testid="kadr-na-zywo"
          style={{
            position: 'absolute', left: 0, top: 0, width: '100%', height: pct(h, 1350), overflow: 'hidden', pointerEvents: 'none', background: '#0D0D0D',
            clipPath: `polygon(0 0, 100% 0, 100% ${pct(h - SLANT_DROP, h)}, 0 100%)`,
            visibility: live && r ? 'visible' : 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute', background: style === 'klub' ? '#D9382E' : 'transparent',
              left: pct(r?.left ?? 0, 1080), top: pct(r?.top ?? 0, h), width: pct(r?.width ?? 1080, 1080), height: pct(r?.height ?? h, h),
            }}
          >
            <img
              src={heroSrc}
              alt=""
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{
                display: 'block', width: '100%', height: '100%',
                ...(style === 'klub' ? { filter: 'grayscale(1) contrast(1.06)', mixBlendMode: 'multiply' } : {}),
              }}
            />
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: pct(220, h), background: 'linear-gradient(to bottom, rgba(13,13,13,0.55), rgba(13,13,13,0))' }} />
          <img src="/brand/uks-banino-logo-mono-white.svg" alt="" style={{ position: 'absolute', left: pct(65, 1080), top: pct(58, h), width: pct(200, 1080) }} />
          {label && (
            // odpowiednik VenueLabel z szablonu meczu: prawa krawędź 1015 px, góra 64 px, 20 px Barlow 600
            <div style={{ position: 'absolute', right: pct(65, 1080), top: pct(64, h), color: '#fff', fontWeight: 600, fontSize: `${(20 / 1080) * 100}cqw`, letterSpacing: `${(2.8 / 1080) * 100}cqw`, textTransform: 'uppercase', lineHeight: 1.2 }}>
              {label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
