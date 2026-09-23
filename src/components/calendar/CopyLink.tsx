'use client';
import { useState } from 'react';

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* brak dostępu do schowka (http, stara przeglądarka, tryb prywatny) — przycisk zostaje bez zmiany */ }
  };
  return <button type="button" className="chip" onClick={onClick}>{copied ? 'Skopiowano' : 'Kopiuj link'}</button>;
}
