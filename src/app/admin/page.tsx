import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isAdmin, isAdminEnabled } from '@/admin/auth';
import { LoginForm } from './LoginForm';
import { adminLogoutAction } from './actions';

// force-dynamic → Next wysyła `Cache-Control: private, no-cache, no-store` (spec §7)
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin — Kanał Klubu', robots: { index: false, follow: false } };

type SP = Record<string, string | string[] | undefined>;

export default async function AdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  if (!isAdminEnabled()) notFound();
  const sp = await searchParams;
  if (!(await isAdmin())) return <LoginForm error={typeof sp.e === 'string' ? sp.e : undefined} />;
  return (
    <main className="wrap">
      <p className="kicker">UKS Banino · Kanał Klubu</p>
      <h1>Panel admina</h1>
      <form action={adminLogoutAction}><button type="submit" className="btn">Wyloguj</button></form>
    </main>
  );
}
