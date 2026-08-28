import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import { testConfig, resetAdapters } from '@/test/helpers';

vi.mock('@/config', () => ({
  getConfig: () => testConfig({ coachNames: ['Ania'], teams: ['młodziczki (2011+)', 'dziewczęta 2013+'], klubProTeams: ['młodziczki (2011+)'] }),
}));

import { createDraft, attachPhoto, setHeroPhoto, MAX_PHOTOS } from './draft';

beforeEach(resetAdapters);

const mecz = (team: string | null) => ({
  author: 'Ania',
  type: 'mecz' as const,
  ip: '1.1.1.1',
  form: { team, opponent: 'X', scoreHome: '1', scoreAway: '2', venue: 'dom' },
});

describe('createDraft', () => {
  it('partnerInfo z drużyny KLUB PRO', async () => {
    expect((await createDraft(mecz('młodziczki (2011+)'))).partnerInfo).toBe(true);
    expect((await createDraft(mecz('dziewczęta 2013+'))).partnerInfo).toBe(false);
    expect((await createDraft(mecz(null))).partnerInfo).toBe(false);
  });

  it('odrzuca nieznanego trenera i zły formularz', async () => {
    await expect(createDraft({ ...mecz(null), author: 'Obcy' })).rejects.toThrow(/trener/i);
    await expect(createDraft({ ...mecz(null), form: { opponent: '' } })).rejects.toThrow();
  });

  it('rate limit 20/h z IP', async () => {
    for (let i = 0; i < 20; i++) await createDraft(mecz(null));
    await expect(createDraft(mecz(null))).rejects.toThrow(/Za dużo/);
  });
});

describe('attachPhoto', () => {
  it('normalizuje do jpeg ≤2048 i ustawia hero', async () => {
    const d = await createDraft(mecz(null));
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#888' } }).png().toBuffer();
    const { path, post } = await attachPhoto(d.id, big);
    expect(path).toBe(`${d.id}/photo-1.jpg`);
    expect(post.heroPhoto).toBe(path);
    const { getStorage } = await import('@/storage');
    const meta = await sharp((await getStorage().get(path))!).metadata();
    expect(meta.width).toBe(2048);
    expect(meta.format).toBe('jpeg');
    const { path: p2 } = await attachPhoto(d.id, big);
    expect((await setHeroPhoto(d.id, p2)).heroPhoto).toBe(p2);
  });

  it('limit zdjęć', async () => {
    const d = await createDraft(mecz(null));
    const small = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#888' } }).jpeg().toBuffer();
    for (let i = 0; i < MAX_PHOTOS; i++) await attachPhoto(d.id, small);
    await expect(attachPhoto(d.id, small)).rejects.toThrow(/Maksymalnie/);
  });
});
