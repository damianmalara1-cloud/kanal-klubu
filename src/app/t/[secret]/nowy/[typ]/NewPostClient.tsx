'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isDraftGoneMessage } from '@/domain/messages';
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

/** Stan formularza przeżywający przeładowanie karty. Generacja trwa 10–20 s — tyle wystarczy, żeby telefon
 * się zablokował albo iOS ubił kartę w tle; do tej pory trener wracał do pustego formularza, a szkicu nie
 * było jak odzyskać (UAT D-02). Blobów zdjęć odtworzyć się nie da, więc trzymamy tylko ŚCIEŻKI już wgranych
 * (szkic na serwerze ma je przy sobie) — dzięki temu ponowne „Wygeneruj post" dokańcza tamten szkic. */
type SavedDraft = { id: string | null; uploadedPaths: string[]; values: Record<string, string>; hero: number; savedAt: number };
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // tyle samo, co `purgeAfter` szkicu na serwerze

export function NewPostClient({ secret, type, teams }: { secret: string; type: PostType; teams: string[] }) {
  const router = useRouter();
  const [author, setAuthor] = useState('');
  // Dopóki nie wiemy, czy imię siedzi w localStorage, nie straszymy banerem — inaczej mignąłby przy każdym wejściu.
  const [authorChecked, setAuthorChecked] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({ venue: 'dom' });
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [hero, setHero] = useState(0);
  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [gen, setGen] = useState<Generated | null>(null);
  // Tekst posta mieszka tutaj, nie w `Preview` — „Popraw dane" odmontowuje podgląd, a ręczna poprawka
  // trenera ma przeżyć powrót do formularza (UAT D-03). Ustawiany przy KAŻDEJ nowej generacji.
  const [caption, setCaption] = useState('');
  const draftKey = `kk-draft-${type}`;
  // Pierwszy przebieg efektu zapisu pomijamy — poleciałby z domyślnymi wartościami z montażu i nadpisał
  // dopiero co odczytany szkic (efekt odtwarzania zdąży już ustawić stan, ale zamknięcie nad `values` w tym
  // przebiegu jest jeszcze sprzed odtworzenia).
  const skipSave = useRef(true);
  useEffect(() => {
    try {
      setAuthor(localStorage.getItem('kk-author') ?? '');
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<SavedDraft>;
      if (typeof d.savedAt !== 'number' || Date.now() - d.savedAt > DRAFT_TTL_MS || !d.values) {
        localStorage.removeItem(draftKey);
        return;
      }
      setValues(d.values);
      setHero(typeof d.hero === 'number' ? d.hero : 0);
      setUploadedPaths(Array.isArray(d.uploadedPaths) ? d.uploadedPaths : []);
      setId(typeof d.id === 'string' ? d.id : null);
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    } finally {
      setAuthorChecked(true);
    }
  }, [draftKey]);
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      const d: SavedDraft = { id, uploadedPaths, values, hero, savedAt: Date.now() };
      localStorage.setItem(draftKey, JSON.stringify(d));
    } catch {
      /* localStorage niedostępny (tryb prywatny) */
    }
  }, [draftKey, id, uploadedPaths, values, hero]);
  const Fields = FIELDS[type];

  // Draft po stronie serwera odzwierciedla dane z chwili wygenerowania — każda zmiana PO utworzeniu draftu
  // (id !== null) unieważnia go, żeby kolejne „Wygeneruj post" stworzyło świeży draft z aktualnymi danymi
  // zamiast generować z przestarzałych (plan tego nie przewidywał — poprawka z task-16, ruling 4). Kasujemy
  // też `gen`, żeby przycisk wrócił do „Wygeneruj post" (patrz `onGenerate` niżej — ruling z review Task 16).
  function invalidateDraft() {
    setId(null);
    setUploadedPaths([]);
    setGen(null);
    setCaption('');
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
      setCaption(g.caption);
      setStage('preview');
    } catch (err) {
      handleError(err, 'form');
    }
  }
  /** Wspólna obsługa błędu z akcji: gdy serwer mówi, że posta już nie ma (wygasł, przeszedł w „done",
   * został wyczyszczony), trzymane w kliencie `id` jest martwe — bez unieważnienia każda kolejna próba
   * dobija się do tego samego nieistniejącego szkicu i trener nie ma jak wyjść poza przeładowaniem. */
  function handleError(err: unknown, back: Stage) {
    const msg = err instanceof Error ? err.message : 'Coś poszło nie tak';
    if (isDraftGoneMessage(msg)) {
      invalidateDraft();
      setError(msg);
      setStage('form');
      return;
    }
    setError(msg);
    setStage(back);
  }
  async function onRegenerate(note: string) {
    if (!id) return;
    setError(null);
    setStage('generating');
    try {
      const g = await generateAction(secret, id, note);
      if ('error' in g) throw new Error(g.error);
      setGen(g);
      setCaption(g.caption); // „Wygeneruj inaczej" świadomie zastępuje tekst — trener jest o tym uprzedzony pod polem podpowiedzi
      setStage('preview');
    } catch (err) {
      // Bez try/catch odrzucenie na poziomie transportu (offline, 500, deploy w trakcie) zostawiało trenera
      // na „Generuję…" bez wyjścia poza przeładowaniem strony (review Task 16, Important #2).
      handleError(err, 'preview');
    }
  }
  async function onFinish(caption: string) {
    if (!id) return;
    setError(null);
    try {
      const r = await finishAction(secret, id, caption);
      if ('error' in r) throw new Error(r.error);
      try {
        localStorage.removeItem(draftKey); // post skończony — nie ma czego wznawiać
      } catch {
        /* localStorage niedostępny (tryb prywatny) */
      }
      router.push(`/t/${secret}/post/${r.id}`); // ekran „Gotowe” (Task 18): kopiuj tekst, pobierz planszę
    } catch (err) {
      handleError(err, 'preview');
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
        <Preview gen={gen} caption={caption} onCaptionChange={setCaption} onRegenerate={onRegenerate} onFinish={onFinish} onBack={() => setStage('form')} />
      </main>
    );
  return (
    <main className="wrap">
      <p className="kicker">
        <Link href={`/t/${secret}`}>← Kanał Klubu</Link> · {author || 'brak imienia'}
      </p>
      <h1>{TYPE_LABEL[type]}</h1>
      {authorChecked && !author && (
        // Wejście prosto na formularz (zakładka, link z czatu) kończyło się komunikatem dopiero po
        // wypełnieniu całości i kliknięciu „Wygeneruj post" — a powrót po imię kasował pracę (UAT D-07).
        <div className="warn" role="alert">
          Najpierw wybierz swoje imię — wróć na <Link href={`/t/${secret}`}>Kanał Klubu</Link>.
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={onGenerate}>
        <Fields values={values} set={set} teams={teams} />
        <PhotoPicker
          photos={photos}
          onChange={onPhotosChange}
          heroIndex={hero}
          onHero={onHeroChange}
          // Linia o wgranych zdjęciach ma sens tylko wtedy, gdy nie ma ich lokalnie (po odtworzeniu z
          // localStorage) — w normalnej sesji kafle mówią to samo, a zdanie byłoby nieprawdą.
          restoredUploads={photos.length === 0 ? uploadedPaths.length : 0}
        />
        <div className="stack" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" type="submit">
            {id && gen ? 'Wróć do podglądu' : 'Wygeneruj post'}
          </button>
        </div>
      </form>
    </main>
  );
}
