'use client';
import { useState } from 'react';
import { CAL_FIELD_LABEL, NOTES_MAX, seriesDates } from '@/domain/calendar';
import { AppError } from '@/lib/errors';
import { plural } from '@/lib/plural';
import { TeamSelect } from '@/components/forms/TeamSelect';
import { dayLabel } from './week';
import type { FormValue } from './form';

const WEEKDAY_LABEL = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd']; // index 0 = poniedziałek (weekdayOf: 1..7)
const PREVIEW_SHOWN = 3;

/** Formularz jednego wydarzenia — pola dobrane do `value.type`, plus (dla treningu, gdy `allowRepeat`) przełącznik
 * serii z podglądem terminów liczonym po stronie klienta (`seriesDates` jest czystą funkcją). `idPrefix` odróżnia
 * pola, gdy formularz jest osadzony więcej niż raz na stronie (np. Task 8 — edycja obok podglądu). */
export function EventForm({
  value, onChange, teams, coachNames, allowRepeat, idPrefix = 'ev',
}: {
  value: FormValue; onChange: (v: FormValue) => void; teams: string[]; coachNames: string[]; allowRepeat: boolean; idPrefix?: string;
}) {
  // „+ inna data końca" jest ukryte domyślnie dla wszystkiego poza turniejem (spec §3.1) — raz otwarte, zostaje
  // otwarte niezależnie od tego, czy pole znów wróci do pustego (trener nie traci dostępu do pola, które właśnie odsłonił).
  const [showEndDate, setShowEndDate] = useState(value.endDate !== '');
  const id = (field: string) => `${idPrefix}-${field}`;
  const set = <K extends keyof FormValue>(k: K, v: FormValue[K]) => onChange({ ...value, [k]: v });
  const toggleCoach = (name: string) => set('coaches', value.coaches.includes(name) ? value.coaches.filter((c) => c !== name) : [...value.coaches, name]);
  const toggleWeekday = (d: number) => set('weekdays', value.weekdays.includes(d) ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d].sort((a, b) => a - b));

  const showSeries = value.type === 'trening' && allowRepeat;
  let preview: { text: string; isError: boolean } | null = null;
  if (showSeries && value.repeat) {
    try {
      const dates = seriesDates(value.date, value.until, value.weekdays);
      const shown = dates.slice(0, PREVIEW_SHOWN).map(dayLabel).join(', ');
      preview = { text: `Utworzy ${dates.length} ${plural(dates.length, 'termin', 'terminy', 'terminów')}: ${shown}${dates.length > PREVIEW_SHOWN ? '…' : ''}`, isError: false };
    } catch (e) {
      preview = { text: e instanceof AppError ? e.message : 'Nie da się policzyć terminów', isError: true };
    }
  }

  return (
    <>
      <TeamSelect id={id('team')} value={value.team} onChange={(v) => set('team', v)} teams={teams} allowAll={value.type === 'inne'} allowOther={false} required={value.type !== 'inne'} />

      {value.type === 'mecz' && (
        <div className="field">
          <label htmlFor={id('opponent')}>{CAL_FIELD_LABEL.opponent}</label>
          <input id={id('opponent')} required maxLength={60} value={value.opponent} onChange={(e) => set('opponent', e.target.value)} />
        </div>
      )}
      {value.type === 'turniej' && (
        <div className="field">
          <label htmlFor={id('name')}>{CAL_FIELD_LABEL.name}</label>
          <input id={id('name')} required maxLength={80} value={value.name} onChange={(e) => set('name', e.target.value)} />
        </div>
      )}
      {value.type === 'inne' && (
        <div className="field">
          <label htmlFor={id('title')}>{CAL_FIELD_LABEL.title}</label>
          <input id={id('title')} required maxLength={80} value={value.title} onChange={(e) => set('title', e.target.value)} />
        </div>
      )}

      <div className="field">
        <label htmlFor={id('date')}>{CAL_FIELD_LABEL.date}</label>
        <input id={id('date')} type="date" required value={value.date} onChange={(e) => set('date', e.target.value)} />
      </div>

      <label className="toggle" style={{ minHeight: 44 }}>
        <input type="checkbox" checked={value.allDay} onChange={(e) => set('allDay', e.target.checked)} />
        Cały dzień
      </label>

      {!value.allDay && (
        <div className="row">
          <div className="field">
            <label htmlFor={id('startTime')}>{CAL_FIELD_LABEL.startTime}</label>
            <input id={id('startTime')} type="time" required value={value.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={id('endTime')}>{CAL_FIELD_LABEL.endTime}</label>
            <input id={id('endTime')} type="time" required value={value.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </div>
        </div>
      )}

      {value.type === 'mecz' && (
        <>
          <div className="field">
            <label htmlFor={id('venue')}>{CAL_FIELD_LABEL.venue}</label>
            <select id={id('venue')} value={value.venue} onChange={(e) => set('venue', e.target.value as 'dom' | 'wyjazd')}>
              <option value="dom">u siebie (Banino)</option>
              <option value="wyjazd">wyjazd</option>
            </select>
          </div>
          {value.venue === 'wyjazd' && (
            <div className="field">
              <label htmlFor={id('matchTime')}>{CAL_FIELD_LABEL.matchTime}</label>
              <input id={id('matchTime')} type="time" value={value.matchTime} onChange={(e) => set('matchTime', e.target.value)} />
              <p className="muted" style={{ fontSize: 13 }}>Początek i koniec to zbiórka i powrót.</p>
            </div>
          )}
        </>
      )}

      {(showEndDate || value.type === 'turniej') ? (
        <div className="field">
          <label htmlFor={id('endDate')}>{CAL_FIELD_LABEL.endDate}</label>
          <input id={id('endDate')} type="date" value={value.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </div>
      ) : (
        <button type="button" className="chip" onClick={() => setShowEndDate(true)} style={{ marginBottom: 14 }}>
          + inna data końca
        </button>
      )}

      <div className="field">
        <label htmlFor={id('place')}>{CAL_FIELD_LABEL.place}</label>
        <input id={id('place')} maxLength={80} value={value.place} onChange={(e) => set('place', e.target.value)} />
      </div>

      <div className="field">
        <label id={id('coaches-label')}>{CAL_FIELD_LABEL.coaches}</label>
        <div className="chips" role="group" aria-labelledby={id('coaches-label')}>
          {coachNames.map((n) => (
            <button key={n} type="button" className="chip" aria-pressed={value.coaches.includes(n)} onClick={() => toggleCoach(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor={id('notes')}>Uwagi (bez nazwisk dzieci)</label>
        <textarea id={id('notes')} maxLength={NOTES_MAX} value={value.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      {showSeries && (
        <>
          <label className="toggle" style={{ minHeight: 44 }}>
            <input type="checkbox" checked={value.repeat} onChange={(e) => set('repeat', e.target.checked)} />
            Co tydzień
          </label>
          {value.repeat && (
            <>
              <div className="field">
                <label id={id('weekdays-label')}>{CAL_FIELD_LABEL.weekdays}</label>
                <div className="chips cal-weekdays" role="group" aria-labelledby={id('weekdays-label')}>
                  {WEEKDAY_LABEL.map((label, i) => {
                    const d = i + 1;
                    return (
                      <button key={d} type="button" className="chip" aria-pressed={value.weekdays.includes(d)} onClick={() => toggleWeekday(d)}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="field">
                <label htmlFor={id('until')}>{CAL_FIELD_LABEL.until}</label>
                <input id={id('until')} type="date" value={value.until} onChange={(e) => set('until', e.target.value)} />
              </div>
              {preview && (
                <p className={`cal-preview${preview.isError ? ' muted' : ''}`} role="status">
                  {preview.text}
                </p>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
