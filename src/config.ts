import { z } from 'zod';

const bool = z.enum(['true', 'false', '']).optional().transform((v) => v === 'true');
const list = (sep: string) => z.string().default('').transform((s) => s.split(sep).map((x) => x.trim()).filter(Boolean));

const schema = z.object({
  APP_URL: z.url(),
  COACH_LINK_SECRET: z.string().min(16),
  COACH_NAMES: list(','),
  TEAMS: list(';'),
  KLUB_PRO_TEAMS: list(';'),
  OPENROUTER_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('anthropic/claude-haiku-4.5'),
  AI_MOCK: bool,
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_KEY: z.string().default(''),
  PARTNER_INFO_ENABLED: bool,
  CRON_SECRET: z.string().default(''),
  MOCK_EXTERNAL: bool,
});

export interface Config {
  appUrl: string;
  coachLinkSecret: string;
  coachNames: string[];
  teams: string[];
  klubProTeams: string[];
  openrouterApiKey: string;
  aiModel: string;
  aiMock: boolean;
  supabaseUrl: string;
  supabaseServiceKey: string;
  partnerInfoEnabled: boolean;
  cronSecret: string;
  mockExternal: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = schema.parse(env);
  return {
    appUrl: e.APP_URL,
    coachLinkSecret: e.COACH_LINK_SECRET,
    coachNames: e.COACH_NAMES,
    teams: e.TEAMS,
    klubProTeams: e.KLUB_PRO_TEAMS,
    openrouterApiKey: e.OPENROUTER_API_KEY,
    aiModel: e.AI_MODEL,
    aiMock: e.AI_MOCK,
    supabaseUrl: e.SUPABASE_URL,
    supabaseServiceKey: e.SUPABASE_SERVICE_KEY,
    partnerInfoEnabled: e.PARTNER_INFO_ENABLED,
    cronSecret: e.CRON_SECRET,
    mockExternal: e.MOCK_EXTERNAL,
  };
}

let cached: Config | null = null;
export function getConfig(): Config {
  if (!cached) cached = loadConfig();
  return cached;
}
