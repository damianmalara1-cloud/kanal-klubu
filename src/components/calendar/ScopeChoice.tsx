'use client';
import type { Scope } from '@/workflow/calendar';

/** Wybór zakresu dla terminu z serii — wspólny dla zapisu i usuwania (`verb` różni tylko nagłówek). Data
 * zostaje w każdym terminie, zmieniają się tylko godziny/miejsce/trenerzy/szczegóły/drużyna — zob. `updateEvent`
 * w `workflow/calendar.ts`, które przy zakresie „następne" liczy pola na WŁASNEJ dacie każdego wiersza serii. */
export function ScopeChoice({
  onPick, onCancel, verb, busy,
}: { onPick: (s: Scope) => void; onCancel: () => void; verb: 'zapisać' | 'usunąć'; busy?: boolean }) {
  return (
    <div className="stack">
      <h2>Co {verb}?</h2>
      {verb === 'zapisać' && <p className="muted">Data zostaje w każdym terminie, zmieniają się godziny, miejsce, trenerzy.</p>}
      <button className="btn btn-primary" type="button" onClick={() => onPick('one')} disabled={busy}>
        Tylko ten termin
      </button>
      <button className="btn" type="button" onClick={() => onPick('following')} disabled={busy}>
        Ten i wszystkie następne
      </button>
      <button className="btn" type="button" onClick={onCancel} disabled={busy}>
        Anuluj
      </button>
    </div>
  );
}
