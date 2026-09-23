import { describe, it, expect } from 'vitest';
import type { AppEvent } from '@/events/types';
import { EVENT_LABEL, eventText, fmtMonth, fmtPln, fmtTime, fmtUsd } from './format';
import { EVENT_TYPES } from '@/events/types';

const e = (type: AppEvent['type'], meta: AppEvent['meta'] = {}): AppEvent =>
  ({ id: '1', at: '2026-09-22T12:05:00.000Z', type, author: 'Ania', postId: null, costUsd: null, meta, content: null });

describe('formaty panelu', () => {
  it('każdy typ zdarzenia ma etykietę', () => {
    for (const t of EVENT_TYPES) expect(EVENT_LABEL[t]).toBeTruthy();
  });

  it('USD: 2–3 miejsca po przecinku, polski separator', () => {
    expect(fmtUsd(0.004)).toBe('0,004 USD');
    expect(fmtUsd(1.5)).toBe('1,50 USD');
    expect(fmtUsd(0)).toBe('0,00 USD');
  });

  it('PLN po kursie', () => {
    expect(fmtPln(1, 3.7)).toMatch(/^3,70\s?zł$/);
  });

  it('czas w strefie Warszawy', () => {
    expect(fmtTime('2026-09-22T12:05:00.000Z')).toBe('22.09, 14:05');
  });

  it('miesiąc słownie', () => {
    expect(fmtMonth('2026-09')).toMatch(/wrze.*2026/);
  });

  it('opisy zdarzeń', () => {
    expect(eventText(e('ai_generated', { regen: false }))).toBe('Generacja AI');
    expect(eventText(e('ai_generated', { regen: true, regenNo: 2 }))).toBe('Generacja AI (regeneracja 2)');
    expect(eventText(e('ai_failed', { reason: 'budget_402' }))).toBe('Błąd AI: brak środków na OpenRouter');
    expect(eventText(e('limit_hit', { limit: 'max_regen' }))).toBe('Limit: 3 regeneracje na post');
    expect(eventText(e('photo_uploaded', { n: 3 }))).toBe('Zdjęcie 3');
    expect(eventText(e('downloaded', { what: 'plansza' }))).toBe('Pobranie: plansza');
    expect(eventText(e('finished', { changedPct: 18 }))).toBe('Gotowe (zmiany 18%)');
    expect(eventText(e('draft_created'))).toBe('Nowy szkic');
  });
});

const cal = (type: AppEvent['type'], meta: Record<string, unknown>, author: string | null = 'Ania'): AppEvent => ({ id: 'x', at: '2026-09-30T10:00:00.000Z', type, author, postId: null, costUsd: null, meta, content: null });
describe('eventText — kalendarz', () => {
  const base = { eventId: 'e1', type: 'trening', team: 'młodzicy (2011+)', title: 'Trening · Krzysiek', startsAt: '2026-09-29T14:30:00.000Z' };
  it('dodanie, seria, usunięcie, przywrócenie', () => {
    expect(eventText(cal('cal_created', base))).toBe('Dodanie: trening młodzicy (2011+), wt 29.09 16:30');
    expect(eventText(cal('cal_series_created', { ...base, count: 38 }))).toBe('Dodanie serii 38 treningów: młodzicy (2011+), od wt 29.09 16:30');
    expect(eventText(cal('cal_deleted', base))).toBe('Usunięcie: trening młodzicy (2011+), wt 29.09 16:30');
    expect(eventText(cal('cal_series_deleted', { ...base, count: 12 }))).toBe('Usunięcie 12 terminów serii: trening młodzicy (2011+), od wt 29.09 16:30');
    expect(eventText(cal('cal_series_deleted', base))).toBe('Usunięcie ? terminów serii: trening młodzicy (2011+), od wt 29.09 16:30');
    expect(eventText(cal('cal_restored', { ...base, type: 'mecz', title: 'vs Wybrzeże' }, null))).toBe('Przywrócenie: mecz młodzicy (2011+) vs Wybrzeże, wt 29.09 16:30');
  });
  it('zmiana pokazuje tylko zmienione pola, godziny po polsku', () => {
    const m = { ...base, changes: { startsAt: { from: '2026-09-29T14:30:00.000Z', to: '2026-09-29T15:00:00.000Z' }, place: { from: null, to: 'Hala B' } } };
    expect(eventText(cal('cal_updated', m))).toBe('Zmiana: trening młodzicy (2011+), wt 29.09 · początek 16:30 → 17:00 · miejsce — → Hala B');
    expect(eventText(cal('cal_series_updated', { ...m, count: 20 }))).toBe('Zmiana 20 terminów serii: trening młodzicy (2011+), od wt 29.09 · początek 16:30 → 17:00 · miejsce — → Hala B');
  });
  it('seria przerwana w połowie dostaje dopisek „· przerwane"', () => {
    const m = { ...base, count: 3, changes: { place: { from: null, to: 'Hala B' } }, partial: true };
    expect(eventText(cal('cal_series_updated', m))).toBe('Zmiana 3 terminów serii: trening młodzicy (2011+), od wt 29.09 · miejsce — → Hala B · przerwane');
  });
});
