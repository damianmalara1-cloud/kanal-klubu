import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('./client', () => ({ callModel: vi.fn() }));
import { callModel } from './client';
import { generateCaption } from './generate';
import type { Post } from '@/domain/types';

const post = { id: '1', type: 'mecz', author: 'Ania', photos: [], form: { team: null, opponent: 'X', scoreHome: 24, scoreAway: 18, venue: 'dom', venueCity: null, notes: null } } as unknown as Post;
const ok = JSON.stringify({ caption: 'Wygrana 24 : 18 z X 🫡', headline: 'ignored', kicker: 'Liga' });
const bad = JSON.stringify({ caption: 'Wygrana 25 : 18 z X', headline: 'h', kicker: 'k' });

describe('generateCaption', () => {
  beforeEach(() => vi.mocked(callModel).mockReset());
  it('zwraca tekst i headline = wynik dla meczu', async () => {
    vi.mocked(callModel).mockResolvedValueOnce(ok);
    const r = await generateCaption(post);
    expect(r.caption).toContain('24 : 18'); expect(r.headline).toBe('24 : 18'); expect(r.factWarning).toBeNull();
  });
  it('regeneruje raz przy rozjeździe faktów, potem flaguje', async () => {
    vi.mocked(callModel).mockResolvedValueOnce(bad).mockResolvedValueOnce(bad);
    const r = await generateCaption(post);
    expect(callModel).toHaveBeenCalledTimes(2); expect(r.factWarning).toMatch(/24/);
  });
  it('ponawia raz przy złym JSON', async () => {
    vi.mocked(callModel).mockResolvedValueOnce('nie json').mockResolvedValueOnce(ok);
    const r = await generateCaption(post); expect(r.caption).toContain('24 : 18');
  });
});
