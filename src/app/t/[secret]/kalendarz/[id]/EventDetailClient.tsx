'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CAL_TYPE_LABEL, calSummary, type CalEvent } from '@/domain/calendar';
import { fmtTime } from '@/admin/format';
import { addDays, isoToLocal } from '@/lib/dates';
import type { Scope } from '@/workflow/calendar';
import { AuthorPick } from '@/components/calendar/AuthorPick';
import { EventForm } from '@/components/calendar/EventForm';
import { fromEvent, toRaw } from '@/components/calendar/form';
import { ScopeChoice } from '@/components/calendar/ScopeChoice';
import { UndoBar } from '@/components/calendar/UndoBar';
import { dayLabel } from '@/components/calendar/week';
import { deleteEventAction, restoreAction, updateEventAction } from '../actions';

const AUTHOR_KEY = 'kk-author';
const ARM_MS = 5000;

type Mode = 'view' | 'edit' | 'askScope:save' | 'askScope:delete' | 'deleted';

export function EventDetailClient({
  secret, event, teams, coachNames, seasonEnd,
}: {
  secret: string; event: CalEvent; teams: string[]; coachNames: string[]; seasonEnd: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('view');
  const [value, setValue] = useState(() => fromEvent(event, seasonEnd));
  const [author, setAuthor] = useState('');
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Druga linia obrony obok czyszczenia timera w `UndoBar` samym — gdyby `onDone` mimo wszystko poleciał
  // po kliknięciu „Cofnij" (np. rodzic odmontowany w międzyczasie), ma być no-opem, nie przekierowaniem
  // mimo udanego przywrócenia.
  const undoing = useRef(false);

  const dateStr = isoToLocal(event.startsAt).date;
  const backHref = `/t/${secret}/kalendarz?d=${dateStr}`;

  // Ten sam klucz `kk-author` co `NewEventClient`/`AuthorPick` — trener wybrany raz na starcie nie wybiera
  // się znowu na widoku szczegółów.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_KEY);
      if (saved && coachNames.includes(saved)) queueMicrotask(() => setAuthor(saved));
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
  }, [coachNames]);

  // Timer „uzbrojenia" usuwania — czyszczony też przy odmontowaniu, żeby nie odpalić `setArmed` na nieistniejącej stronie.
  useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current); }, []);

  function onDeleteClick() {
    if (!armed) {
      setArmed(true);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), ARM_MS);
      return;
    }
    if (armTimer.current) { clearTimeout(armTimer.current); armTimer.current = null; }
    setArmed(false);
    if (event.seriesId) { setMode('askScope:delete'); return; }
    void doDelete('one');
  }

  async function doDelete(scope: Scope) {
    setError(null);
    setBusy(true);
    try {
      const r = await deleteEventAction(secret, author, event.id, scope);
      if ('error' in r) { setError(r.error); setMode('view'); return; }
      setDeletedIds(r.ids);
      setMode('deleted');
    } catch {
      setError('Coś poszło nie tak. Spróbuj jeszcze raz.');
      setMode('view');
    } finally {
      setBusy(false);
    }
  }

  function onSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (event.seriesId) { setMode('askScope:save'); return; }
    void doSave('one');
  }

  async function doSave(scope: Scope) {
    setError(null);
    setBusy(true);
    try {
      const r = await updateEventAction(secret, author, event.id, toRaw(value), scope);
      if ('error' in r) { setError(r.error); setMode('edit'); return; }
      router.push(`/t/${secret}/kalendarz?d=${value.date}`);
    } catch {
      setError('Coś poszło nie tak. Spróbuj jeszcze raz.');
      setMode('edit');
    } finally {
      setBusy(false);
    }
  }

  async function onUndo() {
    undoing.current = true;
    setError(null);
    try {
      const r = await restoreAction(secret, author, deletedIds);
      if ('error' in r) { setError(r.error); return; }
      setMode('view');
      router.refresh();
    } catch {
      setError('Coś poszło nie tak. Spróbuj jeszcze raz.');
    }
  }

  function onUndoTimeout() {
    if (undoing.current) return;
    router.push(backHref);
  }

  const s = isoToLocal(event.startsAt), en = isoToLocal(event.endsAt);
  const endDateDisplay = event.allDay ? addDays(en.date, -1) : en.date;
  const multiDay = endDateDisplay !== s.date;
  const when = event.allDay
    ? (multiDay ? `${dayLabel(s.date)} – ${dayLabel(endDateDisplay)} · cały dzień` : `${dayLabel(s.date)} · cały dzień`)
    : (multiDay ? `${dayLabel(s.date)} ${s.time} – ${dayLabel(endDateDisplay)} ${en.time}` : `${dayLabel(s.date)} · ${s.time}–${en.time}`);

  return (
    <main className="wrap">
      <p className="kicker">
        <Link href={backHref}>← Kalendarz</Link>
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {mode === 'deleted' && <UndoBar count={deletedIds.length} onUndo={onUndo} onDone={onUndoTimeout} />}

      {mode === 'askScope:save' && <ScopeChoice verb="zapisać" busy={busy} onPick={(s) => void doSave(s)} onCancel={() => setMode('edit')} />}

      {mode === 'askScope:delete' && <ScopeChoice verb="usunąć" busy={busy} onPick={(s) => void doDelete(s)} onCancel={() => setMode('view')} />}

      {mode === 'edit' && (
        <>
          <h1>{CAL_TYPE_LABEL[event.type]}</h1>
          {!author && <AuthorPick names={coachNames} value={author} onChange={setAuthor} />}
          <form onSubmit={onSubmitEdit}>
            <EventForm value={value} onChange={setValue} teams={teams} coachNames={coachNames} allowRepeat={false} />
            <div className="stack" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" type="submit" disabled={busy || !author}>
                Zapisz
              </button>
              <button className="btn" type="button" onClick={() => { setValue(fromEvent(event, seasonEnd)); setMode('view'); }}>
                Anuluj
              </button>
            </div>
          </form>
        </>
      )}

      {mode === 'view' && (
        <>
          <h1>{calSummary(event)}</h1>
          {event.seriesId && <p className="muted">termin z serii</p>}
          <p>{when}</p>
          {event.place && <p><strong>Miejsce:</strong> {event.place}</p>}
          {event.coaches.length > 0 && <p><strong>Trener:</strong> {event.coaches.join(', ')}</p>}
          {event.type === 'mecz' && (
            <p>
              <strong>Rywal:</strong> {event.details.opponent}
              <br />
              <strong>Gdzie:</strong> {event.details.venue === 'wyjazd' ? 'wyjazd' : 'u siebie (Banino)'}
              {event.details.venue === 'wyjazd' && event.details.matchTime && (
                <>
                  <br />
                  <strong>Mecz:</strong> o {event.details.matchTime}
                </>
              )}
            </p>
          )}
          {event.details.notes && <p><strong>Uwagi:</strong> {event.details.notes}</p>}
          <p className="muted">
            dodał {event.createdBy} · ostatnia zmiana {event.updatedBy}, {fmtTime(event.updatedAt)}
          </p>

          {!author && <AuthorPick names={coachNames} value={author} onChange={setAuthor} />}
          <div className="stack">
            <button className="btn" type="button" onClick={() => setMode('edit')} disabled={busy}>
              Edytuj
            </button>
            <button className="btn cal-danger" type="button" onClick={onDeleteClick} disabled={busy || !author}>
              {armed ? 'Na pewno? Usuń' : 'Usuń'}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
