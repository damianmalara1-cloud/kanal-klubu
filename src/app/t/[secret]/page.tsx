import { notFound } from 'next/navigation';
import { getConfig } from '@/config';
import { isValidSecret } from '@/lib/access';
import { StartClient } from './StartClient';
export const dynamic = 'force-dynamic';

export default async function StartPage({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!isValidSecret(secret)) notFound();
  return <StartClient secret={secret} names={getConfig().coachNames} />;
}
