'use client';
import { useEffect, useRef, useState } from 'react';

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sprzątanie przy odmontowaniu (np. trener zmienia stronę tuż po kliknięciu) — inaczej `setTimeout`
  // odpala `setCopied` na nieistniejącym już komponencie.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* brak dostępu do schowka (http, stara przeglądarka, tryb prywatny) — przycisk zostaje bez zmiany */ }
  };
  return <button type="button" className="chip" onClick={onClick}>{copied ? 'Skopiowano' : 'Kopiuj link'}</button>;
}
