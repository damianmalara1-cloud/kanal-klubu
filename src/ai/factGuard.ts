import type { MeczForm, Post, SukcesForm } from '@/domain/types';
export function checkFacts(post: Post, caption: string): string | null {
  if (post.type === 'mecz') {
    const m = post.form as MeczForm; const nums: string[] = caption.match(/\d+/g) ?? [];
    const missing = [m.scoreHome, m.scoreAway].filter((n) => !nums.includes(String(n)));
    return missing.length ? `W tekście brakuje wyniku: ${missing.join(', ')} (powinno być ${m.scoreHome} : ${m.scoreAway})` : null;
  }
  if (post.type === 'sukces') {
    const s = post.form as SukcesForm;
    const lower = caption.normalize('NFC').toLowerCase();
    const stem = (w: string) => w.normalize('NFC').toLowerCase().slice(0, Math.max(4, w.length - 2));
    const hit = (full: string) => full.split(/\s+/).filter(Boolean).every((w) => lower.includes(stem(w)));
    const missing = s.names.filter((n) => !hit(n));
    return missing.length ? `W tekście brakuje nazwiska: ${missing.join(', ')}` : null;
  }
  return null;
}
