import { getConfig } from '@/config';
import { log } from '@/lib/log';

const MOCK_OUT = JSON.stringify({
  caption: 'Test: UKS Banino 24 : 18 Sokół Gdańsk.\n\nMłodziczki zagrały równy mecz od pierwszej minuty. Zuzanna Kowalska rzuciła 8 bramek.\n\nPracujemy dalej. Krok po kroku. 🫡',
  headline: 'WYGRANA', kicker: 'Liga wojewódzka · młodziczki',
});

export async function callModel(system: string, user: string): Promise<string> {
  const c = getConfig();
  if (c.aiMock) return MOCK_OUT;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 40_000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${c.openrouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': c.appUrl, 'X-Title': 'Kanal Klubu UKS Banino' },
      body: JSON.stringify({ model: c.aiModel, temperature: 0.7, max_tokens: 1200, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!res.ok) { const body = await res.text(); log.error('openrouter', { status: res.status, body: body.slice(0, 300) }); throw new Error(`OpenRouter ${res.status}`); }
    const json = await res.json() as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content; if (!text) throw new Error('OpenRouter: pusta odpowiedź');
    return text;
  } finally { clearTimeout(t); }
}
