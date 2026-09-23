import { notFound } from 'next/navigation';
import { getConfig } from '@/config';
import { CAL_TYPES, type CalType } from '@/domain/calendar';
import { isValidSecret } from '@/lib/access';
import { todayPl } from '@/lib/dates';
import { NewEventClient } from './NewEventClient';
export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewEventPage({ params, searchParams }: { params: Promise<{ secret: string }>; searchParams: Promise<SP> }) {
  const { secret } = await params;
  if (!isValidSecret(secret)) notFound();
  const sp = await searchParams;
  const date = typeof sp.date === 'string' && DATE.test(sp.date) ? sp.date : todayPl();
  const type = typeof sp.type === 'string' && CAL_TYPES.includes(sp.type as CalType) ? (sp.type as CalType) : null;
  const { teams, coachNames, seasonEnd } = getConfig();
  // `key` na typie: wybór kafelka to nawigacja na `?type=` (Link, nie lokalny setState) — nowy typ ma dostać
  // świeży `NewEventClient` zamiast reużywać poprzedni z resztkami stanu po innym typie wydarzenia.
  return <NewEventClient key={type ?? 'wybor'} secret={secret} date={date} initialType={type} teams={teams} coachNames={coachNames} seasonEnd={seasonEnd} />;
}
