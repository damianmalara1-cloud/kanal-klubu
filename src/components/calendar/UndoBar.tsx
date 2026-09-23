'use client';
import { useEffect, useRef } from 'react';

/** Pasek „Cofnij" po usunięciu — znika sam po `seconds` (domyślnie 10 s), chyba że trener kliknie wcześniej.
 * Timer w `useRef` (nie tylko w domknięciu efektu) i czyszczony SYNCHRONICZNIE w handlerze „Cofnij", zanim
 * poleci `onUndo` — inaczej przy kliknięciu blisko granicy 10 s timer potrafił odpalić się w trakcie
 * `await restoreAction(...)` w rodzicu i wywołać `onDone` (przekierowanie) mimo udanego przywrócenia
 * (znalezione w review Task 8). Czyszczenie przy odmontowaniu zostaje jako druga linia obrony. */
export function UndoBar({ count, onUndo, onDone, seconds = 10 }: { count: number; onUndo: () => void; onDone: () => void; seconds?: number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(onDone, seconds * 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUndo() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    onUndo();
  }

  return (
    <div className="cal-undo" role="status">
      <span>Usunięto {count}</span>
      <button type="button" onClick={handleUndo}>
        Cofnij
      </button>
    </div>
  );
}
