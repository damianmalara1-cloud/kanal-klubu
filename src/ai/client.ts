import { getConfig } from '@/config';
import { log } from '@/lib/log';
import { AppError } from '@/lib/errors';
import type { AiMeter } from './meter';

const MOCK_OUT = JSON.stringify({
  caption: 'Test: UKS Banino 24 : 18 Sokół Gdańsk.\n\nMłodziczki zagrały równy mecz od pierwszej minuty. Zuzanna Kowalska rzuciła 8 bramek.\n\nPracujemy dalej. Krok po kroku. 🫡',
  headline: 'WYGRANA', kicker: 'Liga wojewódzka · młodziczki',
});

const DEFAULT_TIMEOUT_MS = 15_000;

/** `usage` z odpowiedzi OpenRoutera (zwracane zawsze — dokumentacja „Usage Accounting") → wejście licznika.
 * Brak liczbowego `cost` = koszt nieznany (null), nie 0. `cost` jest w kredytach = USD. */
function usageOf(json: unknown): { promptTokens: number; completionTokens: number; costUsd: number | null } {
  const u = (json as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; cost?: unknown } }).usage;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return { promptTokens: num(u?.prompt_tokens) ?? 0, completionTokens: num(u?.completion_tokens) ?? 0, costUsd: num(u?.cost) };
}

export async function callModel(system: string, user: string, opts?: { timeoutMs?: number; meter?: AiMeter }): Promise<string> {
  const c = getConfig();
  const meter = opts?.meter;
  if (c.aiMock) {
    meter?.ok({ promptTokens: 0, completionTokens: 0, costUsd: 0 });
    return MOCK_OUT;
  }
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${c.openrouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': c.appUrl, 'X-Title': 'Kanal Klubu UKS Banino' },
        body: JSON.stringify({ model: c.aiModel, temperature: 0.7, max_tokens: 1200, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      });
    } catch (e) {
      meter?.unknown(); // timeout albo sieć — żądanie mogło dojść do modelu, kwoty nie znamy
      throw e;
    }
    if (!res.ok) {
      meter?.failed();
      const body = await res.text();
      log.error('openrouter', { status: res.status, body: body.slice(0, 300) });
      // 402 = wyczerpany budżet na koncie OpenRouter. Nie mija samo, więc żadnego ponawiania — trener
      // ma dostać komunikat, z którego wynika, że to nie jego wina i kto to odblokowuje.
      if (res.status === 402) throw new AppError('Skończył się budżet AI — daj znać Damianowi', 503);
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
    }
    let json: { choices?: { message?: { content?: string } }[] };
    try {
      json = await res.json() as { choices?: { message?: { content?: string } }[] };
    } catch (e) {
      meter?.unknown();
      throw e;
    }
    meter?.ok(usageOf(json));
    const text = json.choices?.[0]?.message?.content; if (!text) throw new Error('OpenRouter: pusta odpowiedź');
    return text;
  } finally { clearTimeout(t); }
}
