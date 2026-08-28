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
    const f = parseForm('sukces', { names: ['Zuzanna Kowalska', ''], kind: 'kadra' });
    expect(f).toMatchObject({ names: ['Zuzanna Kowalska'], kind: 'kadra' });
    expect(() => parseForm('sukces', { names: [], kind: 'kadra' })).toThrow();
  });
  it('ogloszenie wymaga tytułu i treści', () => {
    expect(() => parseForm('ogloszenie', { title: 'Nabór', body: '' })).toThrow();
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'Wtorki 17:00', team: 'cały klub' })).toMatchObject({ team: null });
  });
  it('turniej wymaga nazwy', () => {
    expect(parseForm('turniej', { name: 'Kaszubski Turniej', result: '2. miejsce' })).toMatchObject({ name: 'Kaszubski Turniej' });
  });
  it('mecz: rywal ma limit 48 znaków (rezerwa na pas partnerów w kreacji)', () => {
    expect(() => parseForm('mecz', { opponent: 'A'.repeat(49), scoreHome: '1', scoreAway: '2' })).toThrow();
    expect(parseForm('mecz', { opponent: 'A'.repeat(48), scoreHome: '1', scoreAway: '2' })).toMatchObject({ opponent: 'A'.repeat(48) });
  });
  it('turniej: nazwa ma limit 60 znaków', () => {
    expect(() => parseForm('turniej', { name: 'A'.repeat(61) })).toThrow();
    expect(parseForm('turniej', { name: 'A'.repeat(60) })).toMatchObject({ name: 'A'.repeat(60) });
  });
  it('turniej: wynik/miejsce ma limit 40 znaków', () => {
    expect(() => parseForm('turniej', { name: 'Turniej', result: 'A'.repeat(41) })).toThrow();
    expect(parseForm('turniej', { name: 'Turniej', result: 'A'.repeat(40) })).toMatchObject({ result: 'A'.repeat(40) });
  });
  it('sukces: nazwisko ma limit 40 znaków (rezerwa na skalowanie czcionki w kreacji)', () => {
    expect(() => parseForm('sukces', { names: ['A'.repeat(41)], kind: 'kadra' })).toThrow();
    expect(parseForm('sukces', { names: ['A'.repeat(40)], kind: 'kadra' })).toMatchObject({ names: ['A'.repeat(40)] });
  });
  it('sukces: opis ma limit 120 znaków', () => {
    expect(() => parseForm('sukces', { names: ['A'], kind: 'kadra', details: 'A'.repeat(121) })).toThrow();
    expect(parseForm('sukces', { names: ['A'], kind: 'kadra', details: 'A'.repeat(120) })).toMatchObject({ details: 'A'.repeat(120) });
  });
  it('ogloszenie: tytuł ma limit 60 znaków', () => {
    expect(() => parseForm('ogloszenie', { title: 'A'.repeat(61), body: 'x' })).toThrow();
    expect(parseForm('ogloszenie', { title: 'A'.repeat(60), body: 'x' })).toMatchObject({ title: 'A'.repeat(60) });
  });
  it('ogloszenie: treść ma limit 600 znaków', () => {
    expect(() => parseForm('ogloszenie', { title: 'Nabór', body: 'A'.repeat(601) })).toThrow();
    expect(parseForm('ogloszenie', { title: 'Nabór', body: 'A'.repeat(600) })).toMatchObject({ body: 'A'.repeat(600) });
  });
});

describe('formTeam / postTitle', () => {
  const base = { id: 'x', createdAt: '', updatedAt: '', author: 'Ania', photos: [] as string[], heroPhoto: null, captionAi: null, caption: null, headline: null, kicker: null, creativePath: null, regenCount: 0, factWarning: null, partnerInfo: false, status: 'draft' as const, reviewToken: 't', tgMessageId: null, reviewerNote: null, fbPostId: null, publishedAt: null, error: null, purgeAfter: null, purgedAt: null, ip: null } as const;
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
