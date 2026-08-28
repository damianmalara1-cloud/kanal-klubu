import { z } from 'zod';
export interface ModelOut { caption: string; headline: string; kicker: string }
const schema = z.object({ caption: z.string().min(1), headline: z.string().default(''), kicker: z.string().default('') });
export function parseModelJson(text: string): ModelOut {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/); const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('Brak JSON w odpowiedzi modelu');
  const o = schema.parse(JSON.parse(raw.slice(start, end + 1)));
  return { caption: o.caption.trim(), headline: o.headline.trim().slice(0, 24), kicker: o.kicker.trim().slice(0, 30) };
}
