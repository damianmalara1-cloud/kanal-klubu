'use client';
import { useEffect } from 'react';

/** Pasek „Cofnij" po usunięciu — znika sam po `seconds` (domyślnie 10 s), chyba że trener kliknie wcześniej.
 * Timer się czyści przy odmontowaniu (nawigacja/klik), żeby `onDone` nie odpalił się na nieistniejącej stronie. */
export function UndoBar({ count, onUndo, onDone, seconds = 10 }: { count: number; onUndo: () => void; onDone: () => void; seconds?: number }) {
  useEffect(() => {
    const t = setTimeout(onDone, seconds * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cal-undo" role="status">
      <span>Usunięto {count}</span>
      <button type="button" onClick={onUndo}>
        Cofnij
      </button>
    </div>
  );
}
