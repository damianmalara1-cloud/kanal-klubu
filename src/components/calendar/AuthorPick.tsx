'use client';
import { useEffect } from 'react';

const KEY = 'kk-author';

/** Kopia logiki chipsów z `StartClient` (ten sam klucz `kk-author`) — wyodrębniona, żeby formularz wydarzenia
 * mógł poprosić o imię bez wracania na start. Rodzic renderuje ten komponent tylko, gdy `value` jest puste;
 * on sam dogrywa odczyt z localStorage (na wypadek, gdyby rodzic tego nie zrobił) i zawsze zapisuje wybór. */
export function AuthorPick({ names, value, onChange }: { names: string[]; value: string; onChange: (n: string) => void }) {
  useEffect(() => {
    if (value) return;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && names.includes(saved)) onChange(saved);
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(n: string) {
    onChange(n);
    try {
      localStorage.setItem(KEY, n);
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
  }

  return (
    <>
      <h2>Kto zmienia?</h2>
      <div className="chips" role="group" aria-label="Kto zmienia">
        {names.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={value === n} onClick={() => pick(n)}>
            {n}
          </button>
        ))}
      </div>
    </>
  );
}
