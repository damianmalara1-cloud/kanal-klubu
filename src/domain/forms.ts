import { z } from 'zod';
import type { MeczForm, OgloszenieForm, Post, PostForm, PostType, SukcesForm, TurniejForm } from './types';

const str = z.string().trim();
const opt = str.transform((s) => (s === '' || s === 'cały klub' ? null : s)).nullable().default(null);
// Limit długości wyniku/miejsca turnieju — bez kolapsu „cały klub" (nieistotny dla tego pola), reszta semantyki opcjonalności jak `opt`.
const resultOpt = str.max(40).transform((s) => (s === '' ? null : s)).nullable().default(null);
const num = z.coerce.number().int().min(0).max(199);

const mecz = z.object({
  // max 48: rezerwa na skalowanie czcionki w kreacji, żeby drużyny nie wjeżdżały w pas partnerów (1180–1350 px)
  team: opt, opponent: str.min(1).max(48), scoreHome: num, scoreAway: num,
  venue: z.enum(['dom', 'wyjazd']).default('dom'), venueCity: opt, notes: opt,
});
const turniej = z.object({ name: str.min(1).max(60), place: opt, team: opt, result: resultOpt, notes: opt });
const sukces = z.object({
  names: z.array(str).transform((a) => a.filter(Boolean)).pipe(z.array(z.string()).min(1)),
  kind: z.enum(['kadra', 'medal', 'wyroznienie', 'inne']), team: opt, details: opt,
});
const ogloszenie = z.object({ title: str.min(1), body: str.min(1), team: opt, date: opt, time: opt, place: opt });

export function parseForm(type: PostType, raw: unknown): PostForm {
  switch (type) {
    case 'mecz': return mecz.parse(raw) as MeczForm;
    case 'turniej': return turniej.parse(raw) as TurniejForm;
    case 'sukces': return sukces.parse(raw) as SukcesForm;
    case 'ogloszenie': return ogloszenie.parse(raw) as OgloszenieForm;
  }
}

export function formTeam(form: PostForm): string | null {
  return 'team' in form ? form.team : null;
}

export function postTitle(post: Post): string {
  const f = post.form;
  switch (post.type) {
    case 'mecz': { const m = f as MeczForm; return `UKS Banino ${m.scoreHome} : ${m.scoreAway} ${m.opponent}${m.team ? ` · ${m.team}` : ''}`; }
    case 'turniej': { const t = f as TurniejForm; return `${t.name}${t.result ? ` · ${t.result}` : ''}`; }
    case 'sukces': { const s = f as SukcesForm; return `${s.names.join(', ')} · ${s.kind}`; }
    case 'ogloszenie': return (f as OgloszenieForm).title;
  }
}
