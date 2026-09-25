'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { POST_TYPES, TYPE_LABEL, type PostStatus, type PostType } from '@/domain/types';
import { STATUS_LABEL } from '@/lib/status';
import { listRecentAction } from './actions';
import { ClubMark } from '@/components/ClubMark';

type Item = { id: string; title: string; type: PostType; status: PostStatus; createdAt: string };
const KEY = 'kk-author';

export function StartClient({ secret, names }: { secret: string; names: string[] }) {
  const [author, setAuthor] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && names.includes(saved)) setAuthor(saved);
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
  }, [names]);

  useEffect(() => {
    if (!author) return;
    try {
      localStorage.setItem(KEY, author);
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
    let ignore = false;
    queueMicrotask(() => {
      if (ignore) return;
      setItems([]);
      setListError(null);
    });
    listRecentAction(secret, author)
      .then((r) => {
        if (ignore) return;
        if ('items' in r) setItems(r.items);
        else setListError(r.error);
      })
      .catch(() => {
        if (!ignore) setListError('Nie udało się wczytać listy');
      });
    return () => {
      ignore = true;
    };
  }, [author, secret]);

  return (
    <main className="wrap">
      <ClubMark />
      {/* aria-label: bez niego nazwa linku sklejałaby się z podtytułem („…mecze · turnieje…") i łapała na substring „Mecz"/„Turniej" (czytniki, testy). */}
      <Link className="cal-entry" href={`/t/${secret}/kalendarz`} aria-label="Kalendarz klubu">
        <span className="cal-entry-text">
          <span className="cal-entry-title">Kalendarz klubu</span>
          <span className="cal-entry-sub">Treningi · mecze · turnieje wszystkich grup</span>
        </span>
        <span className="cal-entry-arrow" aria-hidden="true">→</span>
      </Link>
      <h1>Nowy post</h1>
      <h2>Kto pisze?</h2>
      <div className="chips" role="group" aria-label="Kto pisze">
        {names.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={author === n} onClick={() => setAuthor(n)}>
            {n}
          </button>
        ))}
      </div>
      <h2>Co się wydarzyło?</h2>
      {author ? (
        <div className="tiles">
          {POST_TYPES.map((t) => (
            <Link key={t} className="tile" href={`/t/${secret}/nowy/${t}`}>
              {TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">Najpierw wybierz swoje imię.</p>
      )}
      {author && (items.length > 0 || listError) && (
        <>
          <h2>Twoje ostatnie</h2>
          {listError ? (
            <p className="muted" role="status">
              {listError}
            </p>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
                Tekst i plansza są dostępne przez 7 dni.
              </p>
              <ul className="list">
                {items.map((i) => (
                  <li key={i.id}>
                    <Link href={`/t/${secret}/post/${i.id}`}>
                      {TYPE_LABEL[i.type]} · {i.title}
                    </Link>
                    <span className="status">{STATUS_LABEL[i.status]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
