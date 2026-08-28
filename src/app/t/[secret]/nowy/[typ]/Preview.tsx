'use client';
import { useState } from 'react';
export type Generated = { caption: string; creativeUrl: string; factWarning: string | null; regenCount: number; canRegen: boolean };

/** Tekst posta (`caption`) NIE jest stanem tego komponentu — trzyma go `NewPostClient`, bo „Popraw dane"
 * odmontowuje cały podgląd, a ręczna poprawka trenera musi przeżyć powrót do formularza (UAT D-03). */
export function Preview({
  gen,
  caption,
  onCaptionChange,
  onRegenerate,
  onFinish,
  onBack,
}: {
  gen: Generated;
  caption: string;
  onCaptionChange: (v: string) => void;
  onRegenerate: (note: string) => void;
  onFinish: (caption: string) => Promise<void>;
  onBack: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack">
      {gen.factWarning && <div className="warn" role="status">Sprawdź, czy dane w tekście się zgadzają: {gen.factWarning}</div>}
      {gen.creativeUrl && <img className="creative" src={gen.creativeUrl} alt="Plansza" width={1080} height={1350} />}
      <div className="field"><label htmlFor="caption">Tekst posta</label><textarea id="caption" aria-label="Tekst posta" value={caption} onChange={(e) => onCaptionChange(e.target.value)} style={{ minHeight: 260 }} /></div>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>Hashtagi i informację o programie dokładamy automatycznie na następnym ekranie.</p>
      <button className="btn btn-primary" type="button" disabled={busy || caption.trim().length < 20} onClick={async () => { setBusy(true); try { await onFinish(caption); } finally { setBusy(false); } }}>Gotowe</button>
      <div className="rule" />
      <div className="field"><label htmlFor="note">Podpowiedź (opcjonalnie)</label><input id="note" aria-label="Podpowiedź do wygenerowania" value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. krócej, wspomnij o bramkarce" /></div>
      <button className="btn" type="button" disabled={!gen.canRegen} onClick={() => onRegenerate(note)}>{gen.canRegen ? 'Wygeneruj inaczej' : 'Limit prób — popraw tekst ręcznie'}</button>
      <button className="btn" type="button" onClick={onBack}>Popraw dane</button>
    </div>
  );
}
