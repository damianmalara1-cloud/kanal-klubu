import { describe, it, expect } from 'vitest';
import { fromRow, pageAll, pgArray, toInsert, toPatch } from './supabase';

describe('teams (0005)', () => {
  it('pgArray cytuje nazwy z nawiasami, plusem, cudzysłowem i backslashem', () => {
    expect(pgArray(['młodzicy (2011+)', 'a,b', 'x"y', 'p\\q'])).toBe('{"młodzicy (2011+)","a,b","x\\"y","p\\\\q"}');
  });
  it('zapis trzyma starą kolumnę `team` = pierwsza drużyna; odczyt bez `teams` bierze `team`', () => {
    const ins = toInsert({ type: 'turniej', teams: ['A', 'B'], title: 't', startsAt: 's', endsAt: 'e', allDay: true, place: null, coaches: [], details: {}, seriesId: null, by: 'Ania' });
    expect(ins).toMatchObject({ teams: ['A', 'B'], team: 'A' });
    expect(toPatch({ teams: [] }, 'Ania')).toMatchObject({ teams: [], team: null });
    expect(toPatch({ place: 'H' }, 'Ania')).not.toHaveProperty('team');
    const base = { id: 'u', type: 'inne', title: 't', starts_at: '2026-10-01 14:00:00+00', ends_at: '2026-10-01 15:00:00+00', created_by: 'a', updated_by: 'a', created_at: '2026-09-23 10:00:00+00', updated_at: '2026-09-23 10:00:00+00' };
    expect(fromRow({ ...base, team: 'A' }).teams).toEqual(['A']);
    expect(fromRow({ ...base, team: 'A', teams: ['A', 'B'] }).teams).toEqual(['A', 'B']);
    expect(fromRow({ ...base, team: null, teams: [] }).teams).toEqual([]);
  });
});

describe('pageAll', () => {
  it('kartkuje po 1000 przez .range(), aż strona wróci krótsza niż PAGE', async () => {
    const total = Array.from({ length: 2300 }, (_, i) => ({ id: i }));
    let calls = 0;
    // Stub zamiast prawdziwego query buildera: terminalny `await` wraca wycinkiem tablicy wg OSTATNIEGO
    // wywołania `.range(a, b)` — dokładnie to, co robi Supabase (kolejne `.range()` na tym samym obiekcie
    // tylko przesuwa okno zapytania).
    const stub = {
      range(a: number, b: number) {
        calls++;
        return Promise.resolve({ data: total.slice(a, b + 1), error: null });
      },
    };
    const rows = await pageAll(stub);
    expect(rows).toHaveLength(2300);
    expect(rows.map((r) => r.id)).toEqual(total.map((r) => r.id));
    expect(calls).toBe(3);
  });
  it('błąd na dowolnej stronie przerywa i rzuca dalej', async () => {
    const stub = { range: () => Promise.resolve({ data: null, error: new Error('down') }) };
    await expect(pageAll(stub)).rejects.toThrow('down');
  });
});

describe('SupabaseCalendar mapowanie', () => {
  it('fromRow: snake_case → CalEvent, null-e i daty ISO', () => {
    const e = fromRow({ id: 'u', type: 'mecz', teams: [], title: 'vs X', starts_at: '2026-10-01 14:00:00+00', ends_at: '2026-10-01 16:00:00+00', all_day: false, place: null, coaches: null, details: { opponent: 'X' }, series_id: null, created_by: 'Ania', updated_by: 'Ania', created_at: '2026-09-23 10:00:00+00', updated_at: '2026-09-23 10:00:00+00', deleted_at: null, deleted_by: null });
    expect(e).toMatchObject({ teams: [], coaches: [], details: { opponent: 'X' }, startsAt: '2026-10-01T14:00:00.000Z', deletedAt: null });
  });
  it('toInsert/toPatch: camelCase → kolumny, patch pomija undefined, ustawia updated_*', () => {
    expect(toInsert({ type: 'trening', teams: ['A'], title: 't', startsAt: 's', endsAt: 'e', allDay: false, place: null, coaches: [], details: {}, seriesId: 'sid', by: 'Ania' })).toMatchObject({ series_id: 'sid', created_by: 'Ania', updated_by: 'Ania', starts_at: 's' });
    const p = toPatch({ place: 'Hala', startsAt: undefined }, 'K');
    expect(p).toMatchObject({ place: 'Hala', updated_by: 'K' }); expect('starts_at' in p).toBe(false); expect(typeof p.updated_at).toBe('string');
    expect(toPatch({ place: null }, 'K')).toMatchObject({ place: null });
  });
});
