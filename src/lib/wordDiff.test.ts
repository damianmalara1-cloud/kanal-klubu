import { describe, it, expect } from 'vitest';
import { changedPct, countWords, wordDiff } from './wordDiff';

const rebuild = (parts: ReturnType<typeof wordDiff>, skip: 'add' | 'del') => parts.filter((p) => p.op !== skip).map((p) => p.text).join('');

describe('wordDiff', () => {
  it('identyczne teksty → jeden fragment same', () => {
    expect(wordDiff('Wygrana 24 : 18', 'Wygrana 24 : 18')).toEqual([{ op: 'same', text: 'Wygrana 24 : 18' }]);
  });

  it('dopisek na końcu', () => {
    expect(wordDiff('Wygrana 24 : 18', 'Wygrana 24 : 18 z Sokołem')).toEqual([
      { op: 'same', text: 'Wygrana 24 : 18' },
      { op: 'add', text: ' z Sokołem' },
    ]);
  });

  it('podmiana słowa', () => {
    expect(wordDiff('Wygrana z Sokołem', 'Remis z Sokołem')).toEqual([
      { op: 'del', text: 'Wygrana' },
      { op: 'add', text: 'Remis' },
      { op: 'same', text: ' z Sokołem' },
    ]);
  });

  it('zachowuje akapity: z fragmentów da się odtworzyć oba teksty co do znaku', () => {
    const a = 'Wygrana 24 : 18.\n\nBrawo dziewczyny!\n\nDo zobaczenia.';
    const b = 'Wygrana 24 : 18 z Sokołem.\n\nBrawo!\n\nDziękujemy za doping. Do zobaczenia.';
    const parts = wordDiff(a, b);
    expect(rebuild(parts, 'add')).toBe(a);
    expect(rebuild(parts, 'del')).toBe(b);
  });

  it('puste wejścia', () => {
    expect(wordDiff('', '')).toEqual([]);
    expect(wordDiff('', 'nowy tekst')).toEqual([{ op: 'add', text: 'nowy tekst' }]);
    expect(wordDiff('stary tekst', '')).toEqual([{ op: 'del', text: 'stary tekst' }]);
  });
});

describe('changedPct / countWords', () => {
  it('liczy słowa bez białych znaków', () => {
    expect(countWords('  Wygrana 24 : 18\n\nBrawo ')).toBe(5);
    expect(countWords('')).toBe(0);
  });

  it('0 bez zmian, podmiana 1 z 3 słów = 67', () => {
    expect(changedPct('Wygrana z Sokołem', 'Wygrana z Sokołem')).toBe(0);
    expect(changedPct('Wygrana z Sokołem', 'Remis z Sokołem')).toBe(67);
  });

  it('obcięte do 100; pusty tekst AI', () => {
    expect(changedPct('a', 'b c d e')).toBe(100);
    expect(changedPct('', '')).toBe(0);
    expect(changedPct('', 'coś')).toBe(100);
  });
});
