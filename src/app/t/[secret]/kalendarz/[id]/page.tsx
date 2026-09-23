import { notFound } from 'next/navigation';
import { getConfig } from '@/config';
import { isValidSecret } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { getEvent } from '@/workflow/calendar';
import { EventDetailClient } from './EventDetailClient';
export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: Promise<{ secret: string; id: string }> }) {
  const { secret, id } = await params;
  if (!isValidSecret(secret)) notFound();
  let event;
  try {
    event = await getEvent(id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  const { teams, coachNames, seasonEnd } = getConfig();
  return <EventDetailClient secret={secret} event={event} teams={teams} coachNames={coachNames} seasonEnd={seasonEnd} />;
}
