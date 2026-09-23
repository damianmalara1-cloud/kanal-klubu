import { describe, it, expect } from 'vitest';
import { plural } from './plural';

describe('plural', () => {
  it('1 → one, 2–4 → few (poza 12–14), reszta → many', () => {
    expect(plural(1, 'termin', 'terminy', 'terminów')).toBe('termin');
    expect(plural(2, 'termin', 'terminy', 'terminów')).toBe('terminy');
    expect(plural(4, 'termin', 'terminy', 'terminów')).toBe('terminy');
    expect(plural(5, 'termin', 'terminy', 'terminów')).toBe('terminów');
    expect(plural(12, 'termin', 'terminy', 'terminów')).toBe('terminów');
    expect(plural(14, 'termin', 'terminy', 'terminów')).toBe('terminów');
    expect(plural(22, 'termin', 'terminy', 'terminów')).toBe('terminy');
    expect(plural(0, 'termin', 'terminy', 'terminów')).toBe('terminów');
  });
  it('formy identyczne dla few/many (np. „dni") działają tak samo', () => {
    expect(plural(1, 'dzień', 'dni', 'dni')).toBe('dzień');
    expect(plural(3, 'dzień', 'dni', 'dni')).toBe('dni');
    expect(plural(11, 'dzień', 'dni', 'dni')).toBe('dni');
  });
});
