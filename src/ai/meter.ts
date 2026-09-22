export interface MeterSnapshot {
  calls: number;
  failedCalls: number;
  unknownCostCalls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

/** Licznik jednej generacji (spec §5): `generateCaption` woła model do 4 razy i każde wywołanie trafia tutaj —
 * także to, po którym padło parsowanie JSON, bo za nie też płacimy. */
export class AiMeter {
  private s: MeterSnapshot = { calls: 0, failedCalls: 0, unknownCostCalls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 };

  /** HTTP 200. `costUsd` null = odpowiedź bez `usage.cost` — nie wiemy, ile kosztowała. */
  ok(u: { promptTokens: number; completionTokens: number; costUsd: number | null }): void {
    this.s.calls++;
    this.s.promptTokens += u.promptTokens;
    this.s.completionTokens += u.completionTokens;
    if (u.costUsd === null) this.s.unknownCostCalls++;
    else this.s.costUsd += u.costUsd;
  }

  /** Odpowiedź nie-2xx — OpenRouter nie nalicza za odrzucone żądanie. */
  failed(): void {
    this.s.calls++;
    this.s.failedCalls++;
  }

  /** Timeout / błąd sieci / nieczytelne body — żądanie mogło zostać naliczone, kwoty nie znamy. */
  unknown(): void {
    this.s.calls++;
    this.s.unknownCostCalls++;
  }

  snapshot(): MeterSnapshot {
    return { ...this.s, costUsd: Math.round(this.s.costUsd * 1e6) / 1e6 };
  }
}
