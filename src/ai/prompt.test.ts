import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './prompt';
import type { Post } from '@/domain/types';

const post = { id: '1', type: 'mecz', author: 'Ania', form: { team: 'młodziczki (2011+)', opponent: 'Sokół Gdańsk', scoreHome: 24, scoreAway: 18, venue: 'dom', venueCity: null, notes: 'Zuzanna Kowalska 8 bramek' }, photos: [] } as unknown as Post;

describe('prompt', () => {
  it('system zawiera reguły twarde i wzorce', () => {
    const s = buildSystemPrompt();
    for (const frag of ['UKS Banino', 'Sponsor', 'emoji', 'JSON', 'zmyślone nazwiska', 'hashtag', '24 : 18']) expect(s).toContain(frag);
  });
  it('user zawiera dane formularza i uwagę', () => {
    const u = buildUserPrompt(post, 'krócej');
    expect(u).toContain('Sokół Gdańsk'); expect(u).toContain('24 : 18'); expect(u).toContain('Uwaga od autora: krócej');
  });
});
