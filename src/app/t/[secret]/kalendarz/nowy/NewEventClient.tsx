'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CAL_TYPES, CAL_TYPE_LABEL, type CalType } from '@/domain/calendar';
import { AuthorPick } from '@/components/calendar/AuthorPick';
import { EventForm } from '@/components/calendar/EventForm';
import { emptyForm, toRaw } from '@/components/calendar/form';
import { createEventAction, createSeriesAction } from '../actions';

const AUTHOR_KEY = 'kk-author';

export function NewEventClient({
  secret, date, initialType, teams, coachNames, seasonEnd,
}: {
  secret: string; date: string; initialType: CalType | null; teams: string[]; coachNames: string[]; seasonEnd: string;
}) {
  const router = useRouter();
  // Typ jest ustalany raz przy montażu (z `?type=`) — zmiana typu to nawigacja Linkiem na inne `?type=`, po
  // której `page.tsx` montuje ten komponent od nowa (patrz `key` w `page.tsx`), więc `type` sam nigdy się nie zmienia.
  const [value, setValue] = useState(() => (initialType ? emptyForm(initialType, date, seasonEnd) : null));
  const [author, setAuthor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Ten sam klucz `kk-author` co `StartClient`/`AuthorPick` — trener wybrany raz na starcie nie wybiera
  // się znowu przy każdym nowym wydarzeniu.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_KEY);
      // `queueMicrotask`: ten sam obejście co druga sekcja `StartClient` — `react-hooks/set-state-in-effect`
      // flaguje `setState` wywołane wprost w ciele efektu (nie sam odczyt localStorage w efekcie).
      if (saved && coachNames.includes(saved)) queueMicrotask(() => setAuthor(saved));
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
  }, [coachNames]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setError(null);
    setBusy(true);
    try {
      const r = value.repeat
        ? await createSeriesAction(secret, author, toRaw(value), { weekdays: value.weekdays, until: value.until })
        : await createEventAction(secret, author, toRaw(value));
      if ('error' in r) {
        setError(r.error);
        return;
      }
      router.push(`/t/${secret}/kalendarz?d=${value.date}`);
    } catch {
      setError('Coś poszło nie tak. Spróbuj jeszcze raz.');
    } finally {
      setBusy(false);
    }
  }

  if (!initialType || !value) {
    return (
      <main className="wrap">
        <p className="kicker">
          <Link href={`/t/${secret}/kalendarz?d=${date}`}>← Kalendarz</Link>
        </p>
        <h1>Nowe wydarzenie</h1>
        <div className="tiles">
          {CAL_TYPES.map((t) => (
            <Link key={t} className="tile" href={`/t/${secret}/kalendarz/nowy?date=${date}&type=${t}`}>
              {CAL_TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <p className="kicker">
        <Link href={`/t/${secret}/kalendarz?d=${date}`}>← Kalendarz</Link>
      </p>
      <h1>{CAL_TYPE_LABEL[initialType]}</h1>
      {!author && <AuthorPick names={coachNames} value={author} onChange={setAuthor} />}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={onSubmit}>
        <EventForm value={value} onChange={setValue} teams={teams} coachNames={coachNames} allowRepeat={initialType === 'trening'} />
        <div className="stack" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" type="submit" disabled={busy || !author}>
            Zapisz
          </button>
          <Link className="btn" href={`/t/${secret}/kalendarz?d=${date}`}>
            Anuluj
          </Link>
        </div>
      </form>
    </main>
  );
}
