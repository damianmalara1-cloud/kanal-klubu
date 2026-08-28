'use client';
import { useState } from 'react';

/** Wartość opcji „inna" — celowo taka, jakiej nie da się wpisać w `TEAMS` w konfiguracji, żeby nazwa
 * prawdziwej drużyny nigdy nie zderzyła się z sentinelem. */
const OTHER = '__inna__';

export function TeamSelect({
  value,
  onChange,
  teams,
  allowAll = false,
  id = 'team',
}: {
  value: string;
  onChange: (v: string) => void;
  teams: string[];
  allowAll?: boolean;
  id?: string;
}) {
  // Spec §3.1: trener musi móc opisać drużynę spoza listy (turniej rocznikowy, kadra, oldboye). Tryb wolnego
  // tekstu jest WYPROWADZONY z `value` — wartość spoza `teams` (np. odtworzona z localStorage) sama włącza
  // pole tekstowe. `freeMode` trzyma wybór trenera w chwili, gdy pole jest jeszcze puste.
  // Uwaga: wolny tekst z założenia nie trafi do KLUB_PRO_TEAMS, więc taki post nie dostanie stopki programu.
  const outside = value !== '' && !teams.includes(value);
  const [freeMode, setFreeMode] = useState(false);
  const free = freeMode || outside;
  return (
    <>
      <div className="field">
        <label htmlFor={id}>Drużyna</label>
        <select
          id={id}
          value={free ? OTHER : value}
          onChange={(e) => {
            const v = e.target.value;
            setFreeMode(v === OTHER);
            onChange(v === OTHER ? '' : v);
          }}
        >
          <option value="">{allowAll ? 'cały klub' : '— wybierz —'}</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value={OTHER}>inna</option>
        </select>
      </div>
      {free && (
        <div className="field">
          <label htmlFor={`${id}-inna`}>Jaka drużyna?</label>
          <input id={`${id}-inna`} aria-label="Inna drużyna" value={value} maxLength={40} placeholder="np. oldboye" onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </>
  );
}
