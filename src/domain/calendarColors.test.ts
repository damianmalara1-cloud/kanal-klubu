import { describe, it, expect } from 'vitest';
import { teamColor, PALETTE } from './calendarColors';

const teams = ['młodziczki (2011+)', 'młodzicy (2011+)', 'juniorki'];

describe('teamColor', () => {
  it('stały kolor po pozycji, 13 kolorów w palecie, tekst z kontrastem', () => {
    expect(PALETTE).toHaveLength(13);
    expect(teamColor('młodzicy (2011+)', teams).bg).toBe(PALETTE[1]);
    expect(['#000000', '#FFFFFF']).toContain(teamColor('młodzicy (2011+)', teams).fg);
  });
  it('drużyna spoza listy i „cały klub" → szary', () => {
    expect(teamColor('nieistniejąca', teams)).toEqual({ bg: '#8A8A8A', fg: '#FFFFFF' });
    expect(teamColor(null, teams)).toEqual({ bg: '#8A8A8A', fg: '#FFFFFF' });
  });
});
