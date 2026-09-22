import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig() }));
import { getEvents, recordEvent } from './index';
import { log } from '@/lib/log';

beforeEach(() => resetAdapters());
afterEach(() => vi.restoreAllMocks());

describe('events/index', () => {
  it('tryb mock → adapter pamięciowy, rozpoznawany po kind; singleton', () => {
    expect(getEvents().kind).toBe('memory');
    expect(getEvents()).toBe(getEvents());
  });

  it('recordEvent zapisuje zdarzenie', async () => {
    await recordEvent({ type: 'draft_created', author: 'Ania', postId: 'p1', meta: { postType: 'mecz' } });
    const [e] = await getEvents().listRange('2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z');
    expect(e).toMatchObject({ type: 'draft_created', author: 'Ania', postId: 'p1', meta: { postType: 'mecz' }, content: null, costUsd: null });
  });

  it('recordEvent nie rzuca, gdy zapis padnie — loguje `event` z typem i błędem', async () => {
    const errSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.spyOn(getEvents(), 'add').mockRejectedValueOnce(new Error('db down'));
    await expect(recordEvent({ type: 'hero_set' })).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalledWith('event', { type: 'hero_set', err: 'db down' });
  });
});
