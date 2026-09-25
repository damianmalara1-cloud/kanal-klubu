import type { CalEvent, CalType } from '@/domain/calendar';
import { addDays, isoToLocal, weekdayOf } from '@/lib/dates';
import { joinTeams, splitTeams } from '@/domain/teams';

/** Stan kontrolowanego formularza wydarzenia — nadzbiór pól wszystkich typów (zamiast osobnego typu na
 * `mecz`/`turniej`/`inne`, żeby przełączanie typu w `EventForm` nie gubiło już wpisanych wartości pól
 * wspólnych). Czysty plik (bez JSX), żeby dało się z niego importować w teście `.ts` bez środowiska DOM —
 * `EventForm.tsx` importuje stąd te same funkcje. */
/** `team` — drużyny sklejone `TEAM_SEP` (format chipów `TeamSelect multi`); `toRaw` rozcina je na `teams[]`. */
export type FormValue = {
  type: CalType; team: string; date: string; endDate: string; startTime: string; endTime: string; allDay: boolean;
  place: string; coaches: string[]; notes: string; opponent: string; venue: 'dom' | 'wyjazd'; matchTime: string;
  name: string; title: string; repeat: boolean; weekdays: number[]; until: string;
};

/** Świeży formularz danego typu: trening dostaje domyślny slot 16:30–18:00 (najczęstsza godzina treningu) i
 * serię domyślnie na dzień tygodnia wybranej daty, do końca sezonu — reszta pól startuje pusta. */
export function emptyForm(type: CalType, date: string, seasonEnd: string): FormValue {
  return {
    type, team: '', date, endDate: '',
    startTime: type === 'trening' ? '16:30' : '', endTime: type === 'trening' ? '18:00' : '',
    allDay: false, place: '', coaches: [], notes: '',
    opponent: '', venue: 'dom', matchTime: '', name: '', title: '',
    repeat: false, weekdays: [weekdayOf(date)], until: seasonEnd,
  };
}

/** `FormValue` → wejście `parseCalInput`/`createEventAction`: tylko pola danego typu, puste stringi tam,
 * gdzie zod ma `nullable`, zamienione na `null` (data/godziny końca — `textOpt` w `domain/calendar.ts` sam
 * zamienia '' na null dla `place`/`notes`, więc te dwa lecą wprost). */
export function toRaw(v: FormValue): Record<string, unknown> {
  const base = {
    type: v.type, teams: splitTeams(v.team), date: v.date, endDate: v.endDate || null,
    startTime: v.allDay ? null : v.startTime || null, endTime: v.allDay ? null : v.endTime || null,
    allDay: v.allDay, place: v.place, coaches: v.coaches, notes: v.notes,
  };
  switch (v.type) {
    case 'mecz': return { ...base, opponent: v.opponent, venue: v.venue, matchTime: v.venue === 'wyjazd' && v.matchTime ? v.matchTime : null };
    case 'turniej': return { ...base, name: v.name };
    case 'inne': return { ...base, title: v.title };
    default: return base;
  }
}

/** Formularz z istniejącego wydarzenia — odwrotność `toRaw`: godziny lokalne z ISO; dla całodniowych `endsAt`
 * w bazie jest północą DNIA PO ostatnim dniu wydarzenia, więc `endDate` cofa się o jeden dzień. Seria zawsze
 * wyłączona (`emptyForm` ją zeruje) — edycja pojedynczego wydarzenia nie tworzy nowej serii, `Scope` w
 * `updateEventAction` decyduje, ile wierszy serii dostanie zmianę. */
export function fromEvent(e: CalEvent, seasonEnd: string): FormValue {
  const s = isoToLocal(e.startsAt), en = isoToLocal(e.endsAt);
  const endDate = e.allDay ? addDays(en.date, -1) : en.date;
  return {
    ...emptyForm(e.type, s.date, seasonEnd),
    team: joinTeams(e.teams), endDate: endDate === s.date ? '' : endDate,
    startTime: e.allDay ? '' : s.time, endTime: e.allDay ? '' : en.time, allDay: e.allDay,
    place: e.place ?? '', coaches: e.coaches, notes: e.details.notes ?? '',
    opponent: e.details.opponent ?? '', venue: e.details.venue ?? 'dom', matchTime: e.details.matchTime ?? '',
    name: e.type === 'turniej' ? e.title : '', title: e.type === 'inne' ? e.title : '',
  };
}
