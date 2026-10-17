'use client';
import { useRef, useState } from 'react';
import { MIN_CAPTION } from '@/domain/limits';
import { CROP_OFFSET_MAX, CROP_ZOOM_MAX, CROP_ZOOM_MIN, DEFAULT_CROP, type PhotoCrop, type PhotoStyle } from '@/domain/types';
import { LiveCreative } from './LiveCreative';
export type Generated = { caption: string; creativeUrl: string; factWarning: string | null; regenCount: number; canRegen: boolean; hasPhoto: boolean; photoStyle: PhotoStyle; photoCrop: PhotoCrop; photoHeight: number; photoLabel: string | null };

/** Ile ciszy po ostatnim ruchu suwaka, zanim kadr idzie na serwer — przeciągnięcie = jeden render, nie sto. */
const SAVE_DEBOUNCE_MS = 600;
const sameCrop = (a: PhotoCrop, b: PhotoCrop) => a.dx === b.dx && a.dy === b.dy && a.zoom === b.zoom;
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
  // [klucz, etykieta, min, max, krok, opis kierunku dla wartości]
  const sliders: Array<[keyof PhotoCrop, string, number, number, number, (v: number) => string]> = [
    ['zoom', 'Wielkość (%)', CROP_ZOOM_MIN, CROP_ZOOM_MAX, 1, (v) => (v === 100 ? 'wypełnia pole' : v > 100 ? 'powiększone' : 'pomniejszone')],
    ['dx', 'Przesunięcie lewo/prawo (px)', -CROP_OFFSET_MAX, CROP_OFFSET_MAX, 5, (v) => (v === 0 ? 'na środku' : v > 0 ? `→ ${v} px w prawo` : `← ${-v} px w lewo`)],
    ['dy', 'Przesunięcie góra/dół (px)', -CROP_OFFSET_MAX, CROP_OFFSET_MAX, 5, (v) => (v === 0 ? 'na środku' : v > 0 ? `↓ ${v} px w dół` : `↑ ${-v} px w górę`)],
  ];
  const setPart = (k: keyof PhotoCrop, raw: number, min: number, max: number) => {
    if (Number.isNaN(raw)) return;
    changeCrop({ ...crop, [k]: clamp(Math.round(raw), min, max) });
  };
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
          {sliders.map(([k, label, min, max, stepV, describe]) => (
            <div key={k} style={{ marginTop: 8 }}>
              <label htmlFor={`crop-${k}`}>{label}</label>
              <div className="slider-combo">
                <input id={`crop-${k}`} type="range" min={min} max={max} step={stepV} value={crop[k]} disabled={styleBusy} onChange={(e) => setPart(k, e.currentTarget.valueAsNumber, min, max)} />
                <input type="number" aria-label={`${label} — wartość`} min={min} max={max} step={stepV} value={crop[k]} disabled={styleBusy} onChange={(e) => setPart(k, e.currentTarget.valueAsNumber, min, max)} />
              </div>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>{describe(crop[k])}</p>
            </div>
          ))}
          <button type="button" className="chip" style={{ marginTop: 8, alignSelf: 'flex-start' }} disabled={styleBusy || sameCrop(crop, DEFAULT_CROP)} onClick={() => changeCrop({ ...DEFAULT_CROP })}>Resetuj kadr</button>
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
