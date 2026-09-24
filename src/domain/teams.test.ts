import { describe, it, expect } from 'vitest';
import { joinTeams, splitTeams, teamLabel, TEAM_MULTI_MAX, TEAM_SEP } from './teams';

describe('teams', () => {
  it('splitTeams: null/pusty → [], jedna drużyna → [ona], sklejone → lista bez pustych', () => {
    expect(splitTeams(null)).toEqual([]);
    expect(splitTeams('')).toEqual([]);
    expect(splitTeams('Młodziczki 2014')).toEqual(['Młodziczki 2014']);
    expect(splitTeams(`Młodziczki 2014${TEAM_SEP}Młodzicy 2014${TEAM_SEP} `)).toEqual(['Młodziczki 2014', 'Młodzicy 2014']);
  });
  it('joinTeams: dedup, trim, puste odpada; splitTeams(joinTeams(x)) = x', () => {
    const t = ['Młodziczki 2014', ' Młodzicy 2014 ', '', 'Młodziczki 2014'];
    expect(joinTeams(t)).toBe(`Młodziczki 2014${TEAM_SEP}Młodzicy 2014`);
    expect(splitTeams(joinTeams(t))).toEqual(['Młodziczki 2014', 'Młodzicy 2014']);
    expect(joinTeams([])).toBe('');
  });
  it('teamLabel: liczba pojedyncza vs mnoga', () => {
    expect(teamLabel(null)).toBe('Drużyna');
    expect(teamLabel('Juniorki')).toBe('Drużyna');
    expect(teamLabel(`A${TEAM_SEP}B`)).toBe('Drużyny');
  });
  it('TEAM_MULTI_MAX mieści 3 drużyny po 40 znaków', () => {
    expect(joinTeams(['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)]).length).toBe(TEAM_MULTI_MAX);
  });
});
