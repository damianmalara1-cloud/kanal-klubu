import { describe, it, expect } from 'vitest';
import { loadConfig } from './config';

const base = {
  NODE_ENV: 'development' as const,
  APP_URL: 'http://localhost:3000', COACH_LINK_SECRET: 'abcdefghijklmnop',
  COACH_NAMES: 'Ania, Krzysiek', TEAMS: 'młodziczki (2011+);młodzicy (2011+)',
  KLUB_PRO_TEAMS: 'młodziczki (2011+)',
} satisfies NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('parsuje listy i domyślne wartości', () => {
    const c = loadConfig(base);
    expect(c.coachNames).toEqual(['Ania', 'Krzysiek']);
    expect(c.teams).toEqual(['młodziczki (2011+)', 'młodzicy (2011+)']);
    expect(c.klubProTeams).toEqual(['młodziczki (2011+)']);
    expect(c.aiModel).toBe('anthropic/claude-haiku-4.5');
    expect(c.partnerInfoEnabled).toBe(false);
    expect(c.mockExternal).toBe(false);
  });

  it('odrzuca za krótki sekret', () => {
    expect(() => loadConfig({ ...base, COACH_LINK_SECRET: 'short' })).toThrow();
  });

  it('flagi true/false', () => {
    const c = loadConfig({ ...base, MOCK_EXTERNAL: 'true', AI_MOCK: 'true', PARTNER_INFO_ENABLED: 'true' });
    expect(c.mockExternal).toBe(true);
    expect(c.aiMock).toBe(true);
    expect(c.partnerInfoEnabled).toBe(true);
  });

  it('pusta flaga boolowska (empty string) parsuje się jako false', () => {
    const c = loadConfig({ ...base, AI_MOCK: '' });
    expect(c.aiMock).toBe(false);
  });
});
