import { describe, it, expect } from 'vitest';
import { parseForm, formTeam, postTitle } from './forms';
import type { Post } from './types';

describe('parseForm', () => {
  it('mecz wymaga rywala i wyniku, liczby z tekstu', () => {
    const f = parseForm('mecz', { team: 'młodziczki (2011+)', opponent: 'Sokół Gdańsk', scoreHome: '24', scoreAway: '18', venue: 'dom' });
    expect(f).toMatchObject({ opponent: 'Sokół Gdańsk', scoreHome: 24, scoreAway: 18, venue: 'dom' });
    expect(() => parseForm('mecz', { opponent: '', scoreHome: '1', scoreAway: '2' })).toThrow();
  });
  it('sukces wymaga min. 1 nazwiska i rodzaju', () => {
    const f = parseForm('sukces', { names: ['Zuzanna Kowalska', ''], kind: 'kadra', team: 'młodziczki (2011+)' });
    expect(f).toMatchObject({ names: ['Zuzanna Kowalska'], kind: 'kadra' });
    expect(() => parseForm('sukces', { names: [], kind: 'kadra', team: 'młodziczki (2011+)' })).toThrow();
  });
  it('ogloszenie wymaga tytułu i treści', () => {
    expect(() => parseForm('ogloszenie', { title: 'Nabór', body: '' })).toThrow();
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'Wtorki 17:00', team: 'cały klub' })).toMatchObject({ team: null });
  });
  it('turniej wymaga nazwy', () => {
    expect(parseForm('turniej', { name: 'Kaszubski Turniej', result: '2. miejsce', team: 'młodzicy (2011+)' })).toMatchObject({ name: 'Kaszubski Turniej' });
  });
  it('mecz: rywal ma limit 48 znaków (rezerwa na pas partnerów w kreacji)', () => {
    const mecz48 = (opponent: string) => parseForm('mecz', { team: 'młodziczki (2011+)', opponent, scoreHome: '1', scoreAway: '2' });
    expect(() => mecz48('A'.repeat(49))).toThrow();
    expect(mecz48('A'.repeat(48))).toMatchObject({ opponent: 'A'.repeat(48) });
  });
  it('turniej: nazwa ma limit 60 znaków', () => {
    const turniejName = (name: string) => parseForm('turniej', { name, team: 'młodzicy (2011+)' });
    expect(() => turniejName('A'.repeat(61))).toThrow();
    expect(turniejName('A'.repeat(60))).toMatchObject({ name: 'A'.repeat(60) });
  });
  it('turniej: wynik/miejsce ma limit 40 znaków', () => {
    const turniejResult = (result: string) => parseForm('turniej', { name: 'Turniej', result, team: 'młodzicy (2011+)' });
    expect(() => turniejResult('A'.repeat(41))).toThrow();
    expect(turniejResult('A'.repeat(40))).toMatchObject({ result: 'A'.repeat(40) });
  });
  it('sukces: nazwisko ma limit 40 znaków (rezerwa na skalowanie czcionki w kreacji)', () => {
    const sukcesNames = (n: string) => parseForm('sukces', { names: [n], kind: 'kadra', team: 'młodziczki (2011+)' });
    expect(() => sukcesNames('A'.repeat(41))).toThrow();
    expect(sukcesNames('A'.repeat(40))).toMatchObject({ names: ['A'.repeat(40)] });
  });
  it('sukces: opis ma limit 120 znaków', () => {
    const sukcesDetails = (details: string) => parseForm('sukces', { names: ['A'], kind: 'kadra', details, team: 'młodziczki (2011+)' });
    expect(() => sukcesDetails('A'.repeat(121))).toThrow();
    expect(sukcesDetails('A'.repeat(120))).toMatchObject({ details: 'A'.repeat(120) });
  });
  it('ogloszenie: tytuł ma limit 60 znaków', () => {
    expect(() => parseForm('ogloszenie', { title: 'A'.repeat(61), body: 'x' })).toThrow();
    expect(parseForm('ogloszenie', { title: 'A'.repeat(60), body: 'x' })).toMatchObject({ title: 'A'.repeat(60) });
  });
  it('ogloszenie: treść ma limit 600 znaków', () => {
    expect(() => parseForm('ogloszenie', { title: 'Nabór', body: 'A'.repeat(601) })).toThrow();
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'A'.repeat(600) })).toMatchObject({ body: 'A'.repeat(600) });
  });
  it('ogloszenie: data ma limit 60 znaków (renderuje się na planszy przez DataCell)', () => {
    expect(() => parseForm('ogloszenie', { title: 'Nabór', body: 'x', date: 'A'.repeat(61) })).toThrow();
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'x', date: 'A'.repeat(60) })).toMatchObject({ date: 'A'.repeat(60) });
  });
  it('ogloszenie: godzina ma limit 60 znaków', () => {
    expect(() => parseForm('ogloszenie', { title: 'Nabór', body: 'x', time: 'A'.repeat(61) })).toThrow();
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'x', time: 'A'.repeat(60) })).toMatchObject({ time: 'A'.repeat(60) });
  });
  it('ogloszenie: miejsce ma limit 60 znaków', () => {
    expect(() => parseForm('ogloszenie', { title: 'Nabór', body: 'x', place: 'A'.repeat(61) })).toThrow();
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'x', place: 'A'.repeat(60) })).toMatchObject({ place: 'A'.repeat(60) });
  });
});

describe('drużyna wymagana poza ogłoszeniem', () => {
  // Drużyna to jedyne pole, które decyduje o stopce/pasie KLUB PRO (obowiązek informacyjny §8 umowy z
  // Fundacją). Trener młodziczek, który jej nie wybierze, dostałby post bez oznaczenia programu.
  // Ogłoszenie zostaje opcjonalne — „cały klub" (null) to tam legalny wybór.
  it('mecz bez drużyny → błąd', () => {
    expect(() => parseForm('mecz', { opponent: 'Sokół', scoreHome: '24', scoreAway: '18', venue: 'dom' })).toThrow();
    expect(() => parseForm('mecz', { team: '', opponent: 'Sokół', scoreHome: '24', scoreAway: '18', venue: 'dom' })).toThrow();
  });
  it('turniej bez drużyny → błąd', () => {
    expect(() => parseForm('turniej', { name: 'Kaszubski Turniej' })).toThrow();
  });
  it('sukces bez drużyny → błąd', () => {
    expect(() => parseForm('sukces', { names: ['Zuzanna Kowalska'], kind: 'kadra' })).toThrow();
  });
  it('ogłoszenie bez drużyny nadal przechodzi (cały klub = null)', () => {
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'Wtorki 17:00' })).toMatchObject({ team: null });
  });
  it('drużyna ma limit 40 znaków (wolny tekst z opcji „inna")', () => {
    const ok = (team: string) => parseForm('mecz', { team, opponent: 'Sokół', scoreHome: '1', scoreAway: '2', venue: 'dom' });
    expect(ok('A'.repeat(40))).toMatchObject({ team: 'A'.repeat(40) });
    expect(() => ok('A'.repeat(41))).toThrow();
  });
});

describe('formTeam / postTitle', () => {
  const base = { id: 'x', createdAt: '', updatedAt: '', author: 'Ania', photos: [] as string[], heroPhoto: null, captionAi: null, caption: null, headline: null, kicker: null, creativePath: null, regenCount: 0, factWarning: null, partnerInfo: false, status: 'draft' as const, purgeAfter: null, purgedAt: null, ip: null } as const;
  it('tytuł meczu ma wynik ze spacjami', () => {
    const p: Post = { ...base, type: 'mecz', form: { team: 'młodziczki (2011+)', opponent: 'Sokół', scoreHome: 24, scoreAway: 18, venue: 'dom', venueCity: null, notes: null } };
    expect(postTitle(p)).toBe('UKS Banino 24 : 18 Sokół · młodziczki (2011+)');
    expect(formTeam(p.form)).toBe('młodziczki (2011+)');
  });
  it('tytuł sukcesu = nazwiska', () => {
    const p: Post = { ...base, type: 'sukces', form: { names: ['A B', 'C D'], kind: 'medal', team: null, details: null } };
    expect(postTitle(p)).toBe('A B, C D · medal');
    expect(formTeam(p.form)).toBeNull();
  });
});
