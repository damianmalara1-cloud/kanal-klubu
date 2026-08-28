import { describe, it, expect } from 'vitest';
import { toForm } from './toForm';

describe('toForm', () => {
  it('sukces: mapuje name0..2 na names[], brakujące pola na pusty string', () => {
    expect(toForm('sukces', { name0: 'Jan Kowalski', kind: 'medal', team: 'młodzicy', details: 'MP U15' })).toEqual({
      names: ['Jan Kowalski', '', ''],
      kind: 'medal',
      team: 'młodzicy',
      details: 'MP U15',
    });
  });

  it('sukces: domyślny kind i puste team/details, gdy brak w values', () => {
    expect(toForm('sukces', { name0: 'A' })).toEqual({ names: ['A', '', ''], kind: 'kadra', team: '', details: '' });
  });

  it('sukces: przepisuje wszystkie 3 nazwiska, gdy podane', () => {
    expect(toForm('sukces', { name0: 'A', name1: 'B', name2: 'C', kind: 'wyroznienie' }).names).toEqual(['A', 'B', 'C']);
  });

  it.each(['mecz', 'turniej', 'ogloszenie'] as const)('%s: przepuszcza values bez zmian (ta sama referencja)', (type) => {
    const v = { a: '1', b: '2' };
    expect(toForm(type, v)).toBe(v);
  });
});
