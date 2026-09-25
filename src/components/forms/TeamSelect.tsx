'use client';
import { useState } from 'react';
import { joinTeams, MAX_TEAMS_PER_POST, splitTeams, TEAM_SEP } from '@/domain/teams';

/** Wartość opcji „inna" — celowo taka, jakiej nie da się wpisać w `TEAMS` w konfiguracji, żeby nazwa
 * prawdziwej drużyny nigdy nie zderzyła się z sentinelem. */
const OTHER = '__inna__';

/** Kilka drużyn naraz (turniej, sukces, ogłoszenie): chipy zamiast listy rozwijanej. Wartość to nadal jeden
 * string sklejony `TEAM_SEP` — to, co widzi baza, prompt i plansza. Jedna impreza z dwiema grupami klubu
 * (Młodziczki 2014 + Młodzicy 2014) to jeden post, nie dwa. Wolny tekst „inna" może być jedną z pozycji. */
function TeamChips({
  value,
  onChange,
  teams,
  allowAll,
  allowOther,
  id,
  calendar,
}: {
  value: string;
  onChange: (v: string) => void;
  teams: string[];
  allowAll: boolean;
  allowOther: boolean;
  id: string;
  calendar: boolean;
}) {
  const parts = splitTeams(value);
  const picked = teams.filter((t) => parts.includes(t));
  // Wolny tekst = pierwsza pozycja spoza listy (może być tylko jedna). Tryb wyprowadzony z wartości, jak w select:
  // wartość odtworzona z localStorage sama pokazuje pole tekstowe.
  const other = parts.find((t) => !teams.includes(t)) ?? '';
  const [otherMode, setOtherMode] = useState(false);
  const showOther = allowOther && (otherMode || other !== '');
  // Limit 3 wynika z miejsca na planszy posta — wydarzenie w kalendarzu nie ma planszy, więc bez limitu.
  const full = !calendar && parts.length >= MAX_TEAMS_PER_POST;
  const emit = (p: string[], o: string) => onChange(joinTeams([...teams.filter((t) => p.includes(t)), o]));
  const toggle = (t: string) => emit(picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t], other);
  return (
    <div className="field">
      <label id={`${id}-label`}>Drużyna (można kilka)</label>
      <div className="chips" role="group" aria-labelledby={`${id}-label`}>
        {teams.map((t) => {
          const on = picked.includes(t);
          return (
            <button key={t} type="button" className="chip" aria-pressed={on} disabled={!on && full} onClick={() => toggle(t)}>
              {t}
            </button>
          );
        })}
        {allowOther && (
          <button
            type="button"
            className="chip"
            aria-pressed={showOther}
            disabled={!showOther && full}
            onClick={() => {
              if (showOther) {
                setOtherMode(false);
                emit(picked, '');
              } else setOtherMode(true);
            }}
          >
            inna
          </button>
        )}
      </div>
      {showOther && (
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor={`${id}-inna`}>Jaka drużyna?</label>
          <input
            id={`${id}-inna`}
            aria-label="Inna drużyna"
            value={other}
            maxLength={40}
            placeholder="np. oldboye"
            onChange={(e) => emit(picked, e.target.value.replaceAll(TEAM_SEP.trim(), ' '))}
          />
        </div>
      )}
      <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
        {parts.length === 0
          ? allowAll
            ? 'Nic nie zaznaczone = cały klub.'
            : 'Zaznacz przynajmniej jedną.'
          : full
            ? `Maksymalnie ${MAX_TEAMS_PER_POST} drużyny w jednym poście.`
            : calendar
              ? 'Kilka grup razem? Zaznacz wszystkie — wydarzenie pokaże się w kalendarzu każdej z nich.'
              : 'Kilka grup na jednej imprezie? Zaznacz wszystkie — wyjdzie jeden post.'}
      </p>
    </div>
  );
}

export function TeamSelect({
  value,
  onChange,
  teams,
  allowAll = false,
  allowOther = true,
  required = false,
  multi = false,
  calendar = false,
  id = 'team',
}: {
  value: string;
  onChange: (v: string) => void;
  teams: string[];
  /** Turniej/sukces/ogłoszenie i kalendarz: kilka drużyn naraz (chipy). Mecz (post) zostaje przy jednej (select). */
  multi?: boolean;
  /** Kalendarz: chipy bez limitu 3 (brak planszy) i podpowiedź o wydarzeniu zamiast o poście. */
  calendar?: boolean;
  allowAll?: boolean;
  /** Kalendarz (I3) woła z `false`: drużyna wydarzenia musi zostać z listy `TEAMS`, bo od niej zależy filtr/kolor/
   * `.ics` — wolny tekst tworzyłby drużyny, których żadna z tych rzeczy nie rozpoznaje. Formularze postów
   * (mecz/turniej/ogłoszenie/sukces) zostają na domyślnym `true` — tam wolny tekst opisuje kadrę/oldboyów
   * spoza `TEAMS`, co jest zamierzone (patrz `required` niżej). */
  allowOther?: boolean;
  /** Mecz/turniej/sukces: drużyna jest wymagana, bo to jedyne pole decydujące o stopce i pasie KLUB PRO
   * (§8 umowy z Fundacją). Ogłoszenie zostaje opcjonalne — „cały klub" to legalny wybór. */
  required?: boolean;
  id?: string;
}) {
  // Spec §3.1: trener musi móc opisać drużynę spoza listy (turniej rocznikowy, kadra, oldboye). Tryb wolnego
  // tekstu jest WYPROWADZONY z `value` — wartość spoza `teams` (np. odtworzona z localStorage) sama włącza
  // pole tekstowe. `freeMode` trzyma wybór trenera w chwili, gdy pole jest jeszcze puste.
  // Uwaga: wolny tekst z założenia nie trafi do KLUB_PRO_TEAMS, więc taki post nie dostanie stopki programu.
  const outside = allowOther && value !== '' && !teams.includes(value);
  const [freeMode, setFreeMode] = useState(false);
  // Po hookach (reguła hooków) — `multi` jest stałe dla instancji, ale wczesny return przed useState i tak jest błędem lintera.
  if (multi) return <TeamChips value={value} onChange={onChange} teams={teams} allowAll={allowAll} allowOther={allowOther} id={id} calendar={calendar} />;
  const free = allowOther && (freeMode || outside);
  return (
    <>
      <div className="field">
        <label htmlFor={id}>Drużyna</label>
        <select
          id={id}
          required={required}
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
          {allowOther && <option value={OTHER}>inna</option>}
        </select>
      </div>
      {free && (
        <div className="field">
          <label htmlFor={`${id}-inna`}>Jaka drużyna?</label>
          <input id={`${id}-inna`} aria-label="Inna drużyna" required={required} value={value} maxLength={40} placeholder="np. oldboye" onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </>
  );
}
