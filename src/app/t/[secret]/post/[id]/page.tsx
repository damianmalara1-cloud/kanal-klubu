import { notFound } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { loadReady } from './data';
import { PostReadyClient } from './PostReadyClient';
export const dynamic = 'force-dynamic';
export default async function PostReadyPage({ params }: { params: Promise<{ secret: string; id: string }> }) {
  const { secret, id } = await params;
  let data;
  try { data = await loadReady(secret, id); }
  catch (e) { if (e instanceof AppError && e.status === 404) notFound(); throw e; }
  return <PostReadyClient secret={secret} data={data} />;
}
