import 'server-only';
import { getConfig } from '@/config';
import { MemoryCalendar } from './memory';
import { SupabaseCalendar } from './supabase';
import type { CalendarRepo } from './types';
export type { CalendarRepo, NewCalEvent, CalPatch } from './types';

const g = globalThis as unknown as { __kkCalendar?: CalendarRepo };
export function getCalendar(): CalendarRepo {
  if (!g.__kkCalendar) {
    const c = getConfig();
    g.__kkCalendar = c.mockExternal ? new MemoryCalendar() : new SupabaseCalendar(c.supabaseUrl, c.supabaseServiceKey);
  }
  return g.__kkCalendar;
}
