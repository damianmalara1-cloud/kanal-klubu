import { z } from 'zod';
import { addDays, localToIso, weekdayOf } from '@/lib/dates';
import { AppError } from '@/lib/errors';

export type CalType = 'trening' | 'mecz' | 'turniej' | 'inne';
export const CAL_TYPES: CalType[] = ['trening', 'mecz', 'turniej', 'inne'];
export const CAL_TYPE_LABEL: Record<CalType, string> = { trening: 'Trening', mecz: 'Mecz', turniej: 'Turniej', inne: 'Inne' };

export interface CalDetails { opponent?: string; venue?: 'dom' | 'wyjazd'; matchTime?: string; notes?: string }

export interface CalEvent {
  id: string; type: CalType; team: string | null; title: string;
  startsAt: string; endsAt: string; allDay: boolean; place: string | null; coaches: string[]; details: CalDetails;
  seriesId: string | null; createdBy: string; updatedBy: string; createdAt: string; updatedAt: string;
  deletedAt: string | null; deletedBy: string | null;
}
/** Pola wydarzenia, które pochodzą z formularza (bez id/autorów/dat systemowych). */
export type CalPatchFields = Pick<CalEvent, 'type' | 'team' | 'title' | 'startsAt' | 'endsAt' | 'allDay' | 'place' | 'coaches' | 'details'>;

export const SERIES_MAX = 200;
export const NOTES_MAX = 300;

/** Etykiety pól po polsku — do komunikatów walidacji (`lib/errors.ts` czyta `FIELD_LABEL` z `forms.ts`; kalendarz
 * ma własne pola, więc `actionFail` dostaje już gotowy `AppError`, patrz `parseCalInput`). */
export const CAL_FIELD_LABEL: Record<string, string> = {
  type: 'Typ wydarzenia', team: 'Drużyna', date: 'Data', endDate: 'Data końca', startTime: 'Początek', endTime: 'Koniec',
  place: 'Miejsce', coaches: 'Trener', notes: 'Uwagi', opponent: 'Rywal', venue: 'Gdzie', matchTime: 'Godzina meczu',
  name: 'Nazwa turnieju', title: 'Tytuł', allDay: 'Cały dzień', weekdays: 'Dni tygodnia', until: 'Do',
};

const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const str = z.string().trim();
const textOpt = (max: number) => str.max(max).transform((s) => (s === '' ? null : s)).nullable().default(null);
const base = {
  team: str.max(40).transform((s) => (s === '' || s === 'cały klub' ? null : s)).nullable().default(null),
  date: str.regex(DATE), endDate: str.regex(DATE).nullable().default(null),
  startTime: str.regex(TIME).nullable().default(null), endTime: str.regex(TIME).nullable().default(null),
  allDay: z.coerce.boolean().default(false), place: textOpt(80),
  coaches: z.array(str.max(30)).default([]).transform((a) => [...new Set(a.filter(Boolean))]),
  notes: textOpt(NOTES_MAX),
};
const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('trening'), ...base }),
  z.object({ type: z.literal('mecz'), ...base, opponent: str.min(1).max(60), venue: z.enum(['dom', 'wyjazd']).default('dom'), matchTime: str.regex(TIME).nullable().default(null) }),
  z.object({ type: z.literal('turniej'), ...base, name: str.min(1).max(80) }),
  z.object({ type: z.literal('inne'), ...base, title: str.min(1).max(80) }),
]);
export type CalInput = z.infer<typeof schema>;

const fail = (field: string, what: string): never => { throw new AppError(`${CAL_FIELD_LABEL[field] ?? field}: ${what}`); };

/** Pierwszy błąd zod → `fail(pole, opis)` z polską etykietą — współdzielone przez `parseCalInput` i `parseSeriesInput`,
 * żeby żaden z nich nie wyciekał surowego `ZodError` (angielski, techniczne nazwy pól) do trenera. */
const failFirstIssue = (error: z.ZodError): never => {
  const i = error.issues[0];
  return fail(String(i.path[0] ?? 'formularz'), i.code === 'too_big' ? `do ${String((i as { maximum?: unknown }).maximum)} znaków` : 'sprawdź wartość');
};

/** Walidacja + reguły spoza zod: drużyna z listy (wymagana poza „inne"), trenerzy z listy, koniec po początku. */
export function parseCalInput(raw: unknown, ctx: { teams: string[]; coachNames: string[] }): CalInput {
  const r = schema.safeParse(raw);
  if (!r.success) return failFirstIssue(r.error);
  const v = r.data;
  if (v.team === null && v.type !== 'inne') fail('team', 'wybierz drużynę');
  if (v.team !== null && !ctx.teams.includes(v.team)) fail('team', 'spoza listy');
  for (const c of v.coaches) if (!ctx.coachNames.includes(c)) fail('coaches', `„${c}" spoza listy`);
  if (!v.allDay && (!v.startTime || !v.endTime)) fail('startTime', 'podaj godziny albo zaznacz „cały dzień"');
  const { startsAt, endsAt } = span(v);
  if (endsAt <= startsAt) fail('endTime', 'musi być po początku');
  return v;
}

function span(v: CalInput): { startsAt: string; endsAt: string } {
  const endDate = v.endDate ?? v.date;
  if (v.allDay) return { startsAt: localToIso(v.date, '00:00'), endsAt: localToIso(addDays(endDate, 1), '00:00') };
  return { startsAt: localToIso(v.date, v.startTime!), endsAt: localToIso(endDate, v.endTime!) };
}

export function calTitle(v: CalInput): string {
  switch (v.type) {
    case 'trening': return v.coaches.length ? `Trening · ${v.coaches.join(', ')}` : 'Trening';
    case 'mecz': return `vs ${v.opponent}`;
    case 'turniej': return v.name;
    case 'inne': return v.title;
  }
}

export function inputToFields(v: CalInput): CalPatchFields {
  const details: CalDetails = {};
  if (v.notes) details.notes = v.notes;
  if (v.type === 'mecz') { details.opponent = v.opponent; details.venue = v.venue; if (v.matchTime) details.matchTime = v.matchTime; }
  return { type: v.type, team: v.team, title: calTitle(v), ...span(v), allDay: v.allDay, place: v.place, coaches: v.coaches, details };
}

const seriesSchema = z.object({
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).transform((a) => [...new Set(a)].sort()),
  until: str.regex(DATE),
});
export type SeriesInput = z.infer<typeof seriesSchema>;
export function parseSeriesInput(raw: unknown): SeriesInput {
  const r = seriesSchema.safeParse(raw);
  return r.success ? r.data : failFirstIssue(r.error);
}

/** Daty terminów serii: od `date` (włącznie) do `until` (włącznie), tylko wybrane dni tygodnia. Czysta arytmetyka
 * kalendarzowa — godziny dokłada `localToIso` per termin, więc zmiana czasu nie przesuwa treningów. */
export function seriesDates(date: string, until: string, weekdays: number[]): string[] {
  if (weekdays.length === 0) fail('weekdays', 'wybierz co najmniej jeden');
  if (until < date) fail('until', 'nie może być przed datą startu');
  const out: string[] = [];
  for (let d = date; d <= until; d = addDays(d, 1)) {
    if (weekdays.includes(weekdayOf(d))) out.push(d);
    if (out.length > SERIES_MAX) fail('until', `seria może mieć najwyżej ${SERIES_MAX} terminów`);
  }
  return out;
}

/** Pola wiersza dla jednego terminu serii: te same godziny/miejsce, inna data. */
export function fieldsForDate(v: CalInput, date: string): CalPatchFields {
  const dayOffset = v.endDate ? Math.round((Date.parse(v.endDate) - Date.parse(v.date)) / 86_400_000) : 0;
  return inputToFields({ ...v, date, endDate: dayOffset ? addDays(date, dayOffset) : null } as CalInput);
}

/** `SUMMARY` w .ics i nagłówek karty: „<Grupa> · <Typ> · <tytuł>"; trening już ma „Trening · trener" w tytule. */
export function calSummary(e: Pick<CalEvent, 'type' | 'team' | 'title' | 'coaches'>): string {
  const team = e.team ?? 'UKS Banino';
  if (e.type === 'trening') return `${team} · ${e.title}`;
  return `${team} · ${CAL_TYPE_LABEL[e.type]} · ${e.title}`;
}
