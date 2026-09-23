import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachNames: ['Ania'], teams: ['A'] }) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
import { createEventAction, createSeriesAction, updateEventAction, deleteEventAction, restoreAction } from './actions';
const S = 'abcdefghijklmnop';
const T = { type: 'trening', team: 'A', date: '2026-09-29', startTime: '16:30', endTime: '18:00', coaches: ['Ania'] };
beforeEach(() => resetAdapters());
describe('kalendarz actions', () => {
  it('zły sekret → Nieprawidłowy link; brak imienia → błąd', async () => {
    expect(await createEventAction('zly', 'Ania', T)).toEqual({ error: 'Nieprawidłowy link' });
    expect(await createEventAction(S, '', T)).toEqual({ error: 'Wybierz swoje imię' });
  });
  it('walidacja wraca jako {error} po polsku', async () => {
    expect(await createEventAction(S, 'Ania', { ...T, endTime: '16:00' })).toEqual({ error: 'Koniec: musi być po początku' });
  });
  it('cały cykl: seria → zmiana → usunięcie → przywrócenie', async () => {
    const s = await createSeriesAction(S, 'Ania', T, { weekdays: [2], until: '2026-10-13' });
    expect(s).toMatchObject({ count: 3 });
    if ('error' in s) throw new Error(s.error);
    expect(await updateEventAction(S, 'Ania', s.firstId, { ...T, place: 'Hala' }, 'following')).toMatchObject({ count: 3 });
    const d = await deleteEventAction(S, 'Ania', s.firstId, 'one');
    if ('error' in d) throw new Error(d.error);
    expect(d.ids).toEqual([s.firstId]);
    expect(await restoreAction(S, 'Ania', d.ids)).toEqual({ restored: 1 });
  });
});
