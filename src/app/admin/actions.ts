'use server';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getConfig } from '@/config';
import { checkLogin } from '@/admin/login';
import { ADMIN_COOKIE, makeSession } from '@/admin/session';
import { clientIp } from '@/lib/access';

/** `redirect()` rzuca wyjątek sterujący Next — nie owijać tych wywołań w try/catch. */
export async function adminLoginAction(fd: FormData): Promise<void> {
  const ip = clientIp(await headers()) ?? 'unknown';
  const r = await checkLogin(String(fd.get('password') ?? ''), ip);
  if (r === 'disabled') notFound();
  if (r !== 'ok') redirect(`/admin?e=${r}`);
  const c = getConfig();
  const s = makeSession(c.adminPassword);
  (await cookies()).set(ADMIN_COOKIE, s.value, {
    httpOnly: true,
    secure: c.appUrl.startsWith('https://'), // http://localhost w dev/e2e
    sameSite: 'strict',
    path: '/admin',
    maxAge: s.maxAge,
  });
  redirect('/admin');
}

export async function adminLogoutAction(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: '/admin' });
  redirect('/admin');
}
