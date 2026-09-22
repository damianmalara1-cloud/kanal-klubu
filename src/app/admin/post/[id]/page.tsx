import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isAdmin, isAdminEnabled } from '@/admin/auth';
import { aiVersions, formEntries, postCostUsd } from '@/admin/postView';
import { eventText, fmtTime, fmtUsd } from '@/admin/format';
import { getRepo } from '@/db';
import { getEvents } from '@/events';
import { postTitle } from '@/domain/forms';
import { TYPE_LABEL } from '@/domain/types';
import { wordDiff } from '@/lib/wordDiff';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Historia posta — Admin', robots: { index: false, follow: false } };

export default async function AdminPostPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isAdminEnabled()) notFound();
  if (!(await isAdmin())) redirect('/admin');
  const { id } = await params;
  const [post, events] = await Promise.all([getRepo().get(id), getEvents().listByPost(id)]);
  if (!post && events.length === 0) notFound();
  const versions = aiVersions(events);
  const hasContent = versions.some((v) => v.caption !== null || v.note !== null);
  const author = post?.author ?? events.find((e) => e.author)?.author ?? '—';

  return (
    <main className="wrap adm-wrap">
      <p className="kicker"><Link href="/admin">← Panel admina</Link></p>
      <h1>{post ? postTitle(post) : 'Szkic usunięty po 24 h'}</h1>
      <p className="muted">
        {author}
        {post ? ` · ${TYPE_LABEL[post.type]} · ${post.status === 'done' ? 'gotowy' : 'szkic'} · utworzony ${fmtTime(post.createdAt)}` : ''}
        {` · koszt AI: ${fmtUsd(postCostUsd(events))}`}
      </p>

      <h2>Zdarzenia</h2>
      <ul className="list">
        {events.map((e) => (
          <li key={e.id}>
            <span>{fmtTime(e.at)} · {eventText(e)}</span>
            {(e.type === 'ai_generated' || e.type === 'ai_failed') && e.costUsd !== null ? <span>{fmtUsd(e.costUsd)}</span> : null}
          </li>
        ))}
      </ul>

      {post?.status === 'done' && post.captionAi && post.caption && (
        <section aria-labelledby="diff-h">
          <h2 id="diff-h">Porównanie tekstu</h2>
          <p className="muted">Ostatnia wersja AI → tekst, który trener opublikował.</p>
          <div className="diff">
            {wordDiff(post.captionAi, post.caption).map((p, i) =>
              p.op === 'add' ? <ins key={i}>{p.text}</ins> : p.op === 'del' ? <del key={i}>{p.text}</del> : <span key={i}>{p.text}</span>,
            )}
          </div>
        </section>
      )}

      <h2>Wersje AI i notatki trenera</h2>
      {versions.length === 0 ? (
        <p className="muted">Brak generacji.</p>
      ) : !hasContent ? (
        <p className="muted">Treść usunięta zgodnie z retencją (7 dni).</p>
      ) : (
        <ol className="stack">
          {versions.map((v, i) => (
            <li key={i}>
              <p className="muted">
                {fmtTime(v.at)} · {v.regenNo === 0 ? 'pierwsza wersja' : `regeneracja ${v.regenNo}`}
                {v.costUsd !== null ? ` · ${fmtUsd(v.costUsd)}` : ''}
              </p>
              {v.note && <p className="note">Notatka trenera: {v.note}</p>}
              {v.caption && <div className="diff">{v.caption}</div>}
            </li>
          ))}
        </ol>
      )}

      {post && (
        <>
          <h2>Formularz</h2>
          <dl className="adm-dl">
            {formEntries(post.form).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </>
      )}
    </main>
  );
}
