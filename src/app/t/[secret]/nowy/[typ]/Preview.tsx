'use client';
import { useState } from 'react';
import { MIN_CAPTION } from '@/domain/limits';
import { CROP_ZOOM_MAX, DEFAULT_CROP, type PhotoCrop, type PhotoStyle } from '@/domain/types';
export type Generated = { caption: string; creativeUrl: string; factWarning: string | null; regenCount: number; canRegen: boolean; hasPhoto: boolean; photoStyle: PhotoStyle; photoCrop: PhotoCrop };

const MOVE_STEP = 10, ZOOM_STEP = 25;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Tekst posta (`caption`) NIE jest stanem tego komponentu — trzyma go `NewPostClient`, bo „Popraw dane"
 * odmontowuje cały podgląd, a ręczna poprawka trenera musi przeżyć powrót do formularza (UAT D-03). */
export function Preview({
  gen,
  caption,
  onCaptionChange,
  onRegenerate,
  onPhotoStyle,
  onPhotoCrop,
  onFinish,
  onBack,
}: {
  gen: Generated;
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
  // Jeden wspólny „zajęty” dla stylu i kadru — oba przerysowują tę samą planszę, równoległe żądania by się ścigały.
  const [styleBusy, setStyleBusy] = useState(false);
  const crop = gen.photoCrop;
  async function changeCrop(next: PhotoCrop) {
    if (next.x === crop.x && next.y === crop.y && next.zoom === crop.zoom) return;
    setStyleBusy(true);
    try { await onPhotoCrop(next); } finally { setStyleBusy(false); }
  }
  const move = (dx: number, dy: number) => changeCrop({ ...crop, x: clamp(crop.x + dx, 0, 100), y: clamp(crop.y + dy, 0, 100) });
  const zoomBy = (d: number) => changeCrop({ ...crop, zoom: clamp(crop.zoom + d, 100, CROP_ZOOM_MAX) });
  const cropButtons: Array<[string, string, () => void, boolean]> = [
    ['▲ Góra', 'Pokaż wyższą część zdjęcia', () => move(0, -MOVE_STEP), crop.y <= 0],
    ['▼ Dół', 'Pokaż niższą część zdjęcia', () => move(0, MOVE_STEP), crop.y >= 100],
    ['◀ Lewo', 'Pokaż lewą część zdjęcia', () => move(-MOVE_STEP, 0), crop.x <= 0],
    ['▶ Prawo', 'Pokaż prawą część zdjęcia', () => move(MOVE_STEP, 0), crop.x >= 100],
    ['＋ Przybliż', 'Przybliż zdjęcie', () => zoomBy(ZOOM_STEP), crop.zoom >= CROP_ZOOM_MAX],
    ['－ Oddal', 'Oddal zdjęcie', () => zoomBy(-ZOOM_STEP), crop.zoom <= 100],
  ];
  return (
    <div className="stack">
      {gen.factWarning && <div className="warn" role="status">Sprawdź, czy dane w tekście się zgadzają: {gen.factWarning}</div>}
      {gen.creativeUrl && <img className="creative" src={gen.creativeUrl} alt="Plansza" width={1080} height={1350} />}
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
                disabled={styleBusy}
                onClick={async () => { if (gen.photoStyle === v) return; setStyleBusy(true); try { await onPhotoStyle(v); } finally { setStyleBusy(false); } }}
              >
                {label}
              </button>
            ))}
          </div>
          <label id="photo-crop-label" style={{ marginTop: 8 }}>Kadr zdjęcia{crop.zoom > 100 ? ` · przybliżenie ${crop.zoom}%` : ''}</label>
          <div className="chips" role="group" aria-labelledby="photo-crop-label">
            {cropButtons.map(([label, aria, onClick, atLimit]) => (
              <button key={label} type="button" className="chip" aria-label={aria} disabled={styleBusy || atLimit} onClick={onClick}>{label}</button>
            ))}
            <button type="button" className="chip" disabled={styleBusy || (crop.x === 50 && crop.y === 50 && crop.zoom === 100)} onClick={() => changeCrop({ ...DEFAULT_CROP })}>Wyśrodkuj</button>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Zdjęcie nie rusza się w którąś stronę? Najpierw przybliż — wtedy jest je czym przesuwać.</p>
          {styleBusy && <p className="muted" role="status" style={{ fontSize: 13, margin: 0 }}>Przerysowuję planszę…</p>}
        </div>
      )}
      <div className="field"><label htmlFor="caption">Tekst posta</label><textarea id="caption" aria-label="Tekst posta" value={caption} onChange={(e) => onCaptionChange(e.target.value)} style={{ minHeight: 260 }} /></div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>Hashtagi i informację o programie dokładamy automatycznie na następnym ekranie.</p>
      <button className="btn btn-primary" type="button" disabled={busy || caption.trim().length < MIN_CAPTION} onClick={async () => { setBusy(true); try { await onFinish(caption); } finally { setBusy(false); } }}>Gotowe</button>
      {caption.trim().length < MIN_CAPTION && <p className="muted" style={{ fontSize: 13, margin: 0 }}>Tekst musi mieć co najmniej {MIN_CAPTION} znaków</p>}
      <div className="rule" />
      <div className="field"><label htmlFor="note">Podpowiedź (opcjonalnie)</label><input id="note" aria-label="Podpowiedź do wygenerowania" value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. krócej, wspomnij o bramkarce" /></div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>„Wygeneruj inaczej” zastąpi cały tekst — Twoje poprawki znikną.</p>
      <button className="btn" type="button" disabled={!gen.canRegen} onClick={() => onRegenerate(note)}>{gen.canRegen ? 'Wygeneruj inaczej' : 'Limit prób — popraw tekst ręcznie'}</button>
      <button className="btn" type="button" onClick={onBack}>Popraw dane</button>
    </div>
  );
}
