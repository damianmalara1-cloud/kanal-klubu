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
  const { teams: configTeams, coachNames, seasonEnd } = getConfig();
  // Drużyny wydarzenia mogły zniknąć z `TEAMS` po jego utworzeniu (I3) — dopisane na końcu, żeby chipy
  // w `EventForm` je pokazały (bez tego zaznaczenie drużyny spoza listy byłoby niewidoczne i nie do odznaczenia).
  const teams = [...configTeams, ...event.teams.filter((t) => !configTeams.includes(t))];
  return <EventDetailClient secret={secret} event={event} teams={teams} coachNames={coachNames} seasonEnd={seasonEnd} />;
}
