'use client';
import { useRef, useState } from 'react';
import { MIN_CAPTION } from '@/domain/limits';
import { CROP_ZOOM_MAX, DEFAULT_CROP, type PhotoCrop, type PhotoStyle } from '@/domain/types';
import { LiveCreative } from './LiveCreative';
export type Generated = { caption: string; creativeUrl: string; factWarning: string | null; regenCount: number; canRegen: boolean; hasPhoto: boolean; photoStyle: PhotoStyle; photoCrop: PhotoCrop; photoHeight: number; photoLabel: string | null };

const MOVE_STEP = 10, ZOOM_STEP = 25;
/** Ile ciszy po ostatnim kliknięciu, zanim kadr idzie na serwer — seria kliknięć = jeden render, nie dziesięć. */
const SAVE_DEBOUNCE_MS = 600;
const sameCrop = (a: PhotoCrop, b: PhotoCrop) => a.x === b.x && a.y === b.y && a.zoom === b.zoom;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Tekst posta (`caption`) NIE jest stanem tego komponentu — trzyma go `NewPostClient`, bo „Popraw dane"
 * odmontowuje cały podgląd, a ręczna poprawka trenera musi przeżyć powrót do formularza (UAT D-03). */
export function Preview({
  gen,
  heroSrc,
  caption,
  onCaptionChange,
  onRegenerate,
  onPhotoStyle,
  onPhotoCrop,
  onFinish,
  onBack,
}: {
  gen: Generated;
  heroSrc: string | null;
  caption: string;
  onCaptionChange: (v: string) => void;
  onRegenerate: (note: string) => void;
  onPhotoStyle: (style: PhotoStyle) => Promise<void>;
  onPhotoCrop: (crop: PhotoCrop) => Promise<void>;
  onFinish: (caption: string) => Promise<void>;
  onBack: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [styleBusy, setStyleBusy] = useState(false);
  // Kadr żyje lokalnie i zmienia się od razu (podgląd w `LiveCreative`); na serwer idzie po SAVE_DEBOUNCE_MS
  // ciszy, jednym żądaniem naraz (`flushCrop`), żeby starsze żądanie nie nadpisało w bazie nowszego kadru.
  const [crop, setCrop] = useState<PhotoCrop>(gen.photoCrop);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const latest = useRef(crop);
  const saved = useRef(gen.photoCrop);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  function flushCrop(): Promise<void> {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    inFlight.current ??= (async () => {
      while (!sameCrop(latest.current, saved.current)) {
        const c = latest.current;
        await onPhotoCrop(c);
        saved.current = c;
      }
    })().finally(() => { inFlight.current = null; });
    return inFlight.current;
  }
  function changeCrop(next: PhotoCrop) {
    if (sameCrop(next, crop)) return;
    setCrop(next);
    latest.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushCrop(), SAVE_DEBOUNCE_MS);
  }
  // plansza z serwera nie pokazuje jeszcze bieżącego kadru albo dopiero się wczytuje → pokaż podgląd z przeglądarki
  const live = !sameCrop(crop, gen.photoCrop) || loadedUrl !== gen.creativeUrl;
  const cropPending = !sameCrop(crop, gen.photoCrop);
  const step = (dx: number, dy: number, dz: number) =>
    changeCrop({ x: clamp(crop.x + dx, 0, 100), y: clamp(crop.y + dy, 0, 100), zoom: clamp(crop.zoom + dz, 100, CROP_ZOOM_MAX) });
  // [etykieta, opis dla czytnika, Δx, Δy, Δzoom, czy już na granicy]
  const cropButtons: Array<[string, string, number, number, number, boolean]> = [
    ['▲ Góra', 'Pokaż wyższą część zdjęcia', 0, -MOVE_STEP, 0, crop.y <= 0],
    ['▼ Dół', 'Pokaż niższą część zdjęcia', 0, MOVE_STEP, 0, crop.y >= 100],
    ['◀ Lewo', 'Pokaż lewą część zdjęcia', -MOVE_STEP, 0, 0, crop.x <= 0],
    ['▶ Prawo', 'Pokaż prawą część zdjęcia', MOVE_STEP, 0, 0, crop.x >= 100],
    ['＋ Przybliż', 'Przybliż zdjęcie', 0, 0, ZOOM_STEP, crop.zoom >= CROP_ZOOM_MAX],
    ['－ Oddal', 'Oddal zdjęcie', 0, 0, -ZOOM_STEP, crop.zoom <= 100],
  ];
  return (
    <div className="stack">
      {gen.factWarning && <div className="warn" role="status">Sprawdź, czy dane w tekście się zgadzają: {gen.factWarning}</div>}
      <LiveCreative creativeUrl={gen.creativeUrl} heroSrc={gen.hasPhoto ? heroSrc : null} photoHeight={gen.photoHeight} label={gen.photoLabel} crop={crop} style={gen.photoStyle} live={live} onCreativeLoad={setLoadedUrl} />
      {gen.hasPhoto && (
        <div className="field">
          <label id="photo-style-label">Zdjęcie na planszy</label>
          <div className="chips" role="group" aria-labelledby="photo-style-label">
            {([['klub', 'Klubowe (czerwone)'], ['oryginal', 'Oryginalne kolory']] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                className="chip"
                aria-pressed={gen.photoStyle === v}
                disabled={styleBusy || cropPending}
                onClick={async () => { if (gen.photoStyle === v) return; setStyleBusy(true); try { await onPhotoStyle(v); } finally { setStyleBusy(false); } }}
              >
                {label}
              </button>
            ))}
          </div>
          <label id="photo-crop-label" style={{ marginTop: 8 }}>Kadr zdjęcia{crop.zoom > 100 ? ` · przybliżenie ${crop.zoom}%` : ''}</label>
          <div className="chips" role="group" aria-labelledby="photo-crop-label">
            {cropButtons.map(([label, aria, dx, dy, dz, atLimit]) => (
              <button key={label} type="button" className="chip" aria-label={aria} disabled={styleBusy || atLimit} onClick={() => step(dx, dy, dz)}>{label}</button>
            ))}
            <button type="button" className="chip" disabled={styleBusy || (crop.x === 50 && crop.y === 50 && crop.zoom === 100)} onClick={() => changeCrop({ ...DEFAULT_CROP })}>Wyśrodkuj</button>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Zdjęcie nie rusza się w którąś stronę? Najpierw przybliż — wtedy jest je czym przesuwać.</p>
          {(styleBusy || cropPending) && <p className="muted" role="status" style={{ fontSize: 13, margin: 0 }}>{heroSrc ? 'Zapisuję kadr na planszy…' : 'Przerysowuję planszę…'}</p>}
        </div>
      )}
      <div className="field"><label htmlFor="caption">Tekst posta</label><textarea id="caption" aria-label="Tekst posta" value={caption} onChange={(e) => onCaptionChange(e.target.value)} style={{ minHeight: 260 }} /></div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>Hashtagi i informację o programie dokładamy automatycznie na następnym ekranie.</p>
      <button className="btn btn-primary" type="button" disabled={busy || caption.trim().length < MIN_CAPTION} onClick={async () => { setBusy(true); try { await flushCrop(); await onFinish(caption); } finally { setBusy(false); } }}>Gotowe</button>
      {caption.trim().length < MIN_CAPTION && <p className="muted" style={{ fontSize: 13, margin: 0 }}>Tekst musi mieć co najmniej {MIN_CAPTION} znaków</p>}
      <div className="rule" />
      <div className="field"><label htmlFor="note">Podpowiedź (opcjonalnie)</label><input id="note" aria-label="Podpowiedź do wygenerowania" value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. krócej, wspomnij o bramkarce" /></div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>„Wygeneruj inaczej” zastąpi cały tekst — Twoje poprawki znikną.</p>
      <button className="btn" type="button" disabled={!gen.canRegen} onClick={() => onRegenerate(note)}>{gen.canRegen ? 'Wygeneruj inaczej' : 'Limit prób — popraw tekst ręcznie'}</button>
      <button className="btn" type="button" onClick={onBack}>Popraw dane</button>
    </div>
  );
}
