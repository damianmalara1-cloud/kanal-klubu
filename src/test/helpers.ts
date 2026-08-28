import type { Config } from '@/config';

// Drużyny 1:1 z `.env.example` (TEAMS / KLUB_PRO_TEAMS) — testy, które chcą inny zestaw, nadpisują przez `overrides`.
const TEAMS = [
  'młodziczki (2011+)',
  'młodzicy (2011+)',
  'dziewczęta 2013+',
  'chłopcy 2013+',
  'dziewczęta 2014+',
  'chłopcy 2014+',
  'grupa mieszana 2015+',
  'juniorki młodsze',
];
const KLUB_PRO_TEAMS = ['młodziczki (2011+)', 'młodzicy (2011+)'];

/** Kompletny `Config` do `vi.mock('@/config', () => ({ getConfig: () => testConfig({...}) }))` — `mockExternal`/`aiMock` domyślnie
 * `true`, żeby testy nigdy nie dotykały sieci ani Supabase. `overrides` nadpisuje wybrane pola. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    appUrl: 'http://localhost:3000',
    coachLinkSecret: 'abcdefghijklmnop',
    coachNames: ['Ania', 'Krzysiek'],
    teams: TEAMS,
    klubProTeams: KLUB_PRO_TEAMS,
    openrouterApiKey: '',
    aiModel: 'anthropic/claude-haiku-4.5',
    aiMock: true,
    supabaseUrl: '',
    supabaseServiceKey: '',
    telegramBotToken: '',
    telegramWebhookSecret: '',
    telegramChatId: '1',
    fbPageId: '',
    fbPageToken: '',
    publishMode: 'unpublished',
    partnerInfoEnabled: false,
    cronSecret: '',
    mockExternal: true,
    ...overrides,
  };
}

/** Kasuje singletony `getRepo()`/`getStorage()` (`globalThis.__kkRepo`/`__kkStorage`) — wywołuj w `beforeEach`,
 * żeby każdy test dostawał świeży `MemoryRepo`/`MemoryStorage` zamiast dzielić stan z poprzednim. */
export function resetAdapters(): void {
  delete (globalThis as { __kkRepo?: unknown }).__kkRepo;
  delete (globalThis as { __kkStorage?: unknown }).__kkStorage;
}
