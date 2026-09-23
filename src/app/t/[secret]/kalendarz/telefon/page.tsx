import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getConfig } from '@/config';
import { isValidSecret } from '@/lib/access';
import { webcalLinks } from '@/components/calendar/month';
import { CopyLink } from '@/components/calendar/CopyLink';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Do telefonu — Kanał Klubu', robots: { index: false, follow: false } };

export default async function PhoneCalendarPage({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!isValidSecret(secret)) notFound();
  const { appUrl, teams } = getConfig();
  const links = webcalLinks(appUrl, secret, teams);
  return (
    <main className="wrap">
      <p className="kicker"><Link href={`/t/${secret}/kalendarz`}>← Kalendarz</Link></p>
      <h1>Do telefonu</h1>
      <p><strong>iPhone:</strong> Dotknij nazwy grupy → Subskrybuj. Kalendarz pojawi się w aplikacji Kalendarz obok Twoich spraw.</p>
      <p><strong>Android:</strong> Telefon z Androidem nie dodaje subskrypcji sam. Skopiuj link, wejdź na calendar.google.com na komputerze → koło „Inne kalendarze” kliknij + → „Z adresu URL” → wklej. Po kilku minutach kalendarz zsynchronizuje się z telefonem.</p>
      <ul className="list">
        {links.map((l) => (
          <li key={l.slug}>
            <a href={l.url}>{l.label}</a>
            <CopyLink url={l.url} />
          </li>
        ))}
      </ul>
      <p className="note">Ten link zawiera sekret trenera — nie przekazuj go rodzicom.</p>
      <p className="note">Telefon odświeża subskrypcję co kilka godzin (Google nawet do doby). Zmiana na dziś lub jutro idzie też na WhatsApp.</p>
    </main>
  );
}
