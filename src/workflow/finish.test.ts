import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
const cfg = vi.hoisted(() => ({ partnerInfoEnabled: false }));
vi.mock('@/config', () => ({ getConfig: () => testConfig({ partnerInfoEnabled: cfg.partnerInfoEnabled }) }));
vi.mock('@/creative', () => ({ renderCreative: vi.fn(async () => Buffer.from('PNG')) }));
import { createDraft } from './draft';
import { generate } from './generate';
import { finish, finalText } from './finish';
import { getRepo } from '@/db';
import { HASHTAGS, PARTNER_FOOTER } from '@/ai/postprocess';
import { isDraftGoneMessage } from '@/domain/messages';

beforeEach(() => { resetAdapters(); cfg.partnerInfoEnabled = false; });
const mk = () => createDraft({ author: 'Ania', type: 'mecz', ip: null, form: { team: 'młodziczki (2011+)', opponent: 'Sokół', scoreHome: 24, scoreAway: 18, venue: 'dom' } });

describe('finish', () => {
  it('draft z planszą → done, tekst oczyszczony, purge za 7 dni', async () => {
    const d = await mk(); await generate(d.id);
    const p = await finish(d.id, 'Wygrana 24 : 18!! #cos  \n\nDo zobaczenia.');
    expect(p.status).toBe('done');
    expect(p.caption).toBe('Wygrana 24 : 18!\n\nDo zobaczenia.');
    expect(p.purgeAfter && p.purgeAfter > p.updatedAt).toBe(true);
    expect(Date.parse(p.purgeAfter!) - Date.parse(p.updatedAt)).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
  });
  it('bez wygenerowanej planszy → 409', async () => {
    const d = await mk();
    await expect(finish(d.id, 'Wystarczająco długi tekst posta do testu.')).rejects.toMatchObject({ status: 409 });
  });
  it('za krótki tekst → 400', async () => {
    const d = await mk(); await generate(d.id);
    await expect(finish(d.id, 'krótko')).rejects.toMatchObject({ status: 400 });
  });
  it('drugi raz → 409, nieznane id → 404', async () => {
    const d = await mk(); await generate(d.id); await finish(d.id, 'Wygrana 24 : 18 z Sokołem. Dziękujemy za doping.');
    await expect(finish(d.id, 'Wygrana 24 : 18 z Sokołem. Dziękujemy za doping.')).rejects.toMatchObject({ status: 409 });
    await expect(finish('00000000-0000-0000-0000-000000000000', 'Wygrana 24 : 18 z Sokołem. Dziękujemy.')).rejects.toMatchObject({ status: 404 });
  });
  // Klient rozpoznaje martwy szkic wyłącznie po treści komunikatu (`DRAFT_GONE_MESSAGES`) — własne
  // brzmienie tych błędów zostawiało trenera z `id`, którego serwer już nie zna.
  it('komunikaty o nieistniejącym/zamkniętym poście są rozpoznawane przez isDraftGoneMessage', async () => {
    const d = await mk(); await generate(d.id);
    const long = 'Wygrana 24 : 18 z Sokołem. Dziękujemy za doping.';
    await expect(finish('00000000-0000-0000-0000-000000000000', long)).rejects.toSatisfy((e: Error) => isDraftGoneMessage(e.message));
    await finish(d.id, long);
    await expect(finish(d.id, long)).rejects.toSatisfy((e: Error) => isDraftGoneMessage(e.message));
  });
});

describe('finalText', () => {
  it('hashtagi zawsze; stopka tylko gdy flaga globalna i partnerInfo', async () => {
    const d = await mk(); await generate(d.id); const p = await finish(d.id, 'Wygrana 24 : 18 z Sokołem. Dziękujemy za doping.');
    expect(p.partnerInfo).toBe(true); // młodziczki są w KLUB PRO
    expect(finalText(p)).toBe(`${p.caption}\n\n${HASHTAGS}`);
    cfg.partnerInfoEnabled = true;
    expect(finalText(p)).toBe(`${p.caption}\n\n${HASHTAGS}\n\n${PARTNER_FOOTER}`);
    const off = await getRepo().update(p.id, { partnerInfo: false });
    expect(finalText(off)).toBe(`${p.caption}\n\n${HASHTAGS}`);
  });
});
