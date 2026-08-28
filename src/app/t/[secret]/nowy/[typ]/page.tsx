import { notFound } from 'next/navigation';
import { getConfig } from '@/config';
import { POST_TYPES, type PostType } from '@/domain/types';
import { isValidSecret } from '@/lib/access';
import { NewPostClient } from './NewPostClient';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function NewPostPage({ params }: { params: Promise<{ secret: string; typ: string }> }) {
  const { secret, typ } = await params;
  if (!isValidSecret(secret) || !POST_TYPES.includes(typ as PostType)) notFound();
  return <NewPostClient secret={secret} type={typ as PostType} teams={getConfig().teams} />;
}
