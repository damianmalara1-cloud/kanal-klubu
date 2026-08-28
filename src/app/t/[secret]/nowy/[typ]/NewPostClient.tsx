'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TYPE_LABEL, type PostType } from '@/domain/types';
import { PhotoPicker, type PickedPhoto } from '@/components/PhotoPicker';
import { MeczFields } from '@/components/forms/MeczFields';
import { TurniejFields } from '@/components/forms/TurniejFields';
import { SukcesFields } from '@/components/forms/SukcesFields';
import { OgloszenieFields } from '@/components/forms/OgloszenieFields';
import { createDraftAction, finishAction, generateAction, setHeroAction } from '../../actions';
import { Preview, type Generated } from './Preview';
import { toForm } from './toForm';

const FIELDS = { mecz: MeczFields, turniej: TurniejFields, sukces: SukcesFields, ogloszenie: OgloszenieFields } as const;
type Stage = 'form' | 'generating' | 'preview';

export function NewPostClient({ secret, type, teams }: { secret: string; type: PostType; teams: string[] }) {
  const router = useRouter();
  const [author, setAuthor] = useState('');
  const [values, setValues] = useState<Record<string, string>>({ venue: 'dom' });
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [hero, setHero] = useState(0);
  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [gen, setGen] = useState<Generated | null>(null);
  useEffect(() => {
    try {
      setAuthor(localStorage.getItem('kk-author') ?? '');
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
  }, []);
  const Fields = FIELDS[type];

  // Draft po stronie serwera odzwierciedla dane z chwili wygenerowania — każda zmiana PO utworzeniu draftu
  // (id !== null) unieważnia go, żeby kolejne „Wygeneruj post" stworzyło świeży draft z aktualnymi danymi
  // zamiast generować z przestarzałych (plan tego nie przewidywał — poprawka z task-16, ruling 4). Kasujemy
  // też `gen`, żeby przycisk wrócił do „Wygeneruj post" (patrz `onGenerate` niżej — ruling z review Task 16).
  function invalidateDraft() {
    setId(null);
    setUploadedPaths([]);
    setGen(null);
  }
  const set = (k: string, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (id) invalidateDraft();
  };
  function onPhotosChange(next: PickedPhoto[]) {
    setPhotos(next);
    if (id) invalidateDraft();
  }
  function onHeroChange(i: number) {
    setHero(i);
    if (id) invalidateDraft();
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (id && gen) {
      // Draft niezmieniony od ostatniej udanej generacji (powrót z „Popraw dane" bez edycji) — samo
      // przejście do podglądu, bez wywołania serwera i bez zużywania regeneracji (review Task 16, Minor #6).
      setStage('preview');
      return;
    }
    if (!author) {
      setError('Wróć i wybierz swoje imię.');
      return;
    }
    setStage('generating');
    try {
      let draftId = id;
      if (!draftId) {
        const d = await createDraftAction(secret, { author, type, form: toForm(type, values) });
        if ('error' in d) throw new Error(d.error);
        draftId = d.id;
        setId(draftId);
      }
      // Wysyłka wznawialna: zaczyna od pierwszego jeszcze niewgranego zdjęcia (`uploadedPaths.length`), żeby
      // ponowne kliknięcie po nieudanym uploadzie nie wysyłało od nowa tego, co już się udało (ruling 5).
      const paths = [...uploadedPaths];
      for (const p of photos.slice(paths.length)) {
        const fd = new FormData();
        fd.append('file', p.blob, 'foto.jpg');
        const r = await fetch(`/api/upload?secret=${encodeURIComponent(secret)}&id=${draftId}`, { method: 'POST', body: fd });
        const j = (await r.json()) as { path?: string; error?: string };
        if (!r.ok || !j.path) throw new Error(j.error ?? 'Nie udało się wgrać zdjęcia');
        paths.push(j.path);
        setUploadedPaths([...paths]);
      }
      // Plansza ustawiana dopiero gdy WSZYSTKIE zdjęcia są wgrane — żadnej generacji z niepełnym kompletem zdjęć.
      if (photos.length > 1 && hero > 0) {
        const h = await setHeroAction(secret, draftId, paths[hero]);
        if ('error' in h) throw new Error(h.error);
      }
      const g = await generateAction(secret, draftId);
      if ('error' in g) throw new Error(g.error);
      setGen(g);
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak');
      setStage('form');
    }
  }
  async function onRegenerate(note: string) {
    if (!id) return;
    setError(null);
    setStage('generating');
    try {
      const g = await generateAction(secret, id, note);
      if ('error' in g) throw new Error(g.error);
      setGen(g);
      setStage('preview');
    } catch (err) {
      // Bez try/catch odrzucenie na poziomie transportu (offline, 500, deploy w trakcie) zostawiało trenera
      // na „Generuję…" bez wyjścia poza przeładowaniem strony (review Task 16, Important #2).
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak');
      setStage('preview');
    }
  }
  async function onFinish(caption: string) {
    if (!id) return;
    setError(null);
    try {
      const r = await finishAction(secret, id, caption);
      if ('error' in r) throw new Error(r.error);
      router.push(`/t/${secret}/post/${r.id}`); // ekran „Gotowe” (Task 18): kopiuj tekst, pobierz planszę
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak');
      setStage('preview');
    }
  }
  if (stage === 'generating')
    return (
      <main className="wrap">
        <p className="kicker">{TYPE_LABEL[type]}</p>
        <h1>Generuję…</h1>
        <p className="muted">Piszę tekst i składam planszę. To trwa 10–20 sekund.</p>
      </main>
    );
  if (stage === 'preview' && gen)
    return (
      <main className="wrap">
        <p className="kicker">{TYPE_LABEL[type]}</p>
        <h1>Sprawdź post</h1>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <Preview gen={gen} onRegenerate={onRegenerate} onFinish={onFinish} onBack={() => setStage('form')} />
      </main>
    );
  return (
    <main className="wrap">
      <p className="kicker">
        <Link href={`/t/${secret}`}>← Kanał Klubu</Link> · {author || 'brak imienia'}
      </p>
      <h1>{TYPE_LABEL[type]}</h1>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={onGenerate}>
        <Fields values={values} set={set} teams={teams} />
        <PhotoPicker photos={photos} onChange={onPhotosChange} heroIndex={hero} onHero={onHeroChange} />
        <div className="stack" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" type="submit">
            {id && gen ? 'Wróć do podglądu' : 'Wygeneruj post'}
          </button>
        </div>
      </form>
    </main>
  );
}
