import { describe, it, expect } from 'vitest';
import { AiMeter } from './meter';

describe('AiMeter', () => {
  it('nowy licznik = zera', () => {
    expect(new AiMeter().snapshot()).toEqual({ calls: 0, failedCalls: 0, unknownCostCalls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 });
  });

  it('sumuje udane wywołania, odrzucone i bez danych o koszcie', () => {
    const m = new AiMeter();
    m.ok({ promptTokens: 1500, completionTokens: 300, costUsd: 0.003 });
    m.ok({ promptTokens: 1400, completionTokens: 280, costUsd: null }); // 200 bez usage.cost
    m.failed(); // np. 429
    m.unknown(); // timeout
    expect(m.snapshot()).toEqual({ calls: 4, failedCalls: 1, unknownCostCalls: 2, promptTokens: 2900, completionTokens: 580, costUsd: 0.003 });
  });

  it('koszt zaokrąglony do 6 miejsc (brak śmieci z floatów)', () => {
    const m = new AiMeter();
    m.ok({ promptTokens: 0, completionTokens: 0, costUsd: 0.1 });
    m.ok({ promptTokens: 0, completionTokens: 0, costUsd: 0.2 });
    expect(m.snapshot().costUsd).toBe(0.3);
  });
});
