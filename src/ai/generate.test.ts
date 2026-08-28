import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('./client', () => ({ callModel: vi.fn() }));
import { callModel } from './client';
import { generateCaption } from './generate';
import { log } from '@/lib/log';
import type { Post } from '@/domain/types';

const post = { id: '1', type: 'mecz', author: 'Ania', photos: [], form: { team: null, opponent: 'X', scoreHome: 24, scoreAway: 18, venue: 'dom', venueCity: null, notes: null } } as unknown as Post;
const ok = JSON.stringify({ caption: 'Wygrana 24 : 18 z X 🫡', headline: 'ignored', kicker: 'Liga' });
const bad = JSON.stringify({ caption: 'Wygrana 25 : 18 z X', headline: 'h', kicker: 'k' });

describe('generateCaption', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(callModel).mockReset();
    warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('zwraca tekst i headline = wynik dla meczu', async () => {
    vi.mocked(callModel).mockResolvedValueOnce(ok);
    const r = await generateCaption(post);
    expect(r.caption).toContain('24 : 18'); expect(r.headline).toBe('24 : 18'); expect(r.factWarning).toBeNull();
  });

  it('regeneruje raz przy rozjeździe faktów, potem flaguje, i przekazuje uwagę o brakującym fakcie do drugiego wywołania', async () => {
    vi.mocked(callModel).mockResolvedValueOnce(bad).mockResolvedValueOnce(bad);
    const r = await generateCaption(post);
    expect(callModel).toHaveBeenCalledTimes(2); expect(r.factWarning).toMatch(/24/);
    const secondUserPrompt = vi.mocked(callModel).mock.calls[1][1];
    expect(secondUserPrompt).toContain('Poprzednia wersja pominęła');
    expect(secondUserPrompt).toContain('18');
  });

  it('ponawia raz przy złym JSON', async () => {
    vi.mocked(callModel).mockResolvedValueOnce('nie json').mockResolvedValueOnce(ok);
    const r = await generateCaption(post);
    expect(r.caption).toContain('24 : 18');
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('sprawdza fakty na oczyszczonym tekście, nie na surowym — regeneruje, gdy wynik żyje wyłącznie w hashtagu', async () => {
    // W surowym tekście "18" widoczne tylko wewnątrz "#18" — stary błąd sprawdzał fakty na surowym tekście,
    // widział "18" i uznawał wynik za obecny, mimo że cleanCaption zaraz wytnie hashtag i wynik zniknie z opublikowanego posta.
    // Poprawka: guard czyta tekst PO cleanCaption, więc wykrywa brak i regeneruje.
    const rawScoreOnlyInHashtag = JSON.stringify({ caption: 'Wygrana 24 : X\n#18', headline: 'h', kicker: 'k' });
    vi.mocked(callModel).mockResolvedValueOnce(rawScoreOnlyInHashtag).mockResolvedValueOnce(ok);
    const r = await generateCaption(post);
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(r.caption).toContain('24 : 18');
    expect(r.factWarning).toBeNull();
  });

  it('pomija regenerację przy braku budżetu czasu (deadline), zwraca caption z factWarning', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.mocked(callModel).mockImplementationOnce(async () => {
      vi.setSystemTime(31_000); // symuluje długie pierwsze wywołanie modelu — zjada budżet na regenerację
      return bad;
    });
    const r = await generateCaption(post);
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(r.factWarning).toMatch(/24/);
  });

  it('pomija retry parsowania przy braku budżetu czasu, rzuca oryginalny błąd', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.mocked(callModel).mockImplementationOnce(async () => {
      vi.setSystemTime(31_000);
      return 'nie json';
    });
    await expect(generateCaption(post)).rejects.toThrow(/Brak JSON/);
    expect(callModel).toHaveBeenCalledTimes(1);
  });
});
