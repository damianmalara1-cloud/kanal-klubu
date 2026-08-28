'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { TYPE_LABEL } from '@/domain/types';
import type { ReadyData } from './data';

async function copyText(text: string, fallback: HTMLTextAreaElement | null): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* brak Clipboard API (http, stara przeglądarka) — próbujemy zaznaczeniem */ }
  if (!fallback) return false;
  fallback.focus(); fallback.select(); fallback.setSelectionRange(0, text.length);
  try { return document.execCommand('copy'); } catch { return false; }
}

export function PostReadyClient({ secret, data }: { secret: string; data: ReadyData }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  return (
    <main className="wrap">
      <p className="kicker">{TYPE_LABEL[data.type]} · {data.title}</p>
      <h1>Gotowe</h1>
      <div className="note">Wklej tekst w nowym poście na stronie klubu na Facebooku i dodaj pobraną planszę oraz zdjęcia.</div>
      <div className="stack" style={{ marginTop: 16 }}>
        <div className="field"><label htmlFor="final">Tekst posta</label><textarea id="final" ref={ta} aria-label="Tekst posta" readOnly value={data.text} style={{ minHeight: 280 }} /></div>
        <button className="btn btn-primary" type="button" onClick={async () => setCopied((await copyText(data.text, ta.current)) ? 'ok' : 'fail')}>Kopiuj tekst</button>
        {copied === 'ok' && <p className="status" role="status">Skopiowano</p>}
        {copied === 'fail' && <p className="error" role="alert">Nie udało się skopiować — zaznacz tekst i skopiuj ręcznie.</p>}
        {data.creativeUrl && <img className="creative" src={data.creativeUrl} alt="Plansza" width={1080} height={1350} />}
        {data.downloadCreativeUrl && <a className="btn" href={data.downloadCreativeUrl} download>Pobierz planszę</a>}
        {data.photoDownloads.map((p) => <a key={p.url} className="btn" href={p.url} download>Pobierz {p.label.toLowerCase()}</a>)}
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>iPhone: jeśli plik otworzy się zamiast pobrać, przytrzymaj obraz i wybierz „Zapisz do Zdjęć”.</p>
        <div className="rule" />
        <Link className="btn" href={`/t/${secret}`}>Dodaj kolejny</Link>
      </div>
    </main>
  );
}
