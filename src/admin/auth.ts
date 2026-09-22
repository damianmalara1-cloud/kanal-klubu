import 'server-only';
import { cookies } from 'next/headers';
import { getConfig } from '@/config';
import { ADMIN_COOKIE, adminEnabled, verifySession } from './session';

export const isAdminEnabled = (): boolean => adminEnabled(getConfig().adminPassword);

export async function isAdmin(): Promise<boolean> {
  return verifySession(getConfig().adminPassword, (await cookies()).get(ADMIN_COOKIE)?.value);
}
