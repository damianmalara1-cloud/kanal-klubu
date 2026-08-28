'use client';

export type Generated = { caption: string; creativeUrl: string; factWarning: string | null; regenCount: number; canRegen: boolean };

// Placeholder — pełna implementacja w Task 17 (podgląd kreacji, edycja podpisu, "Popraw dane" / "Wygeneruj ponownie" / "Gotowe").
export function Preview(_: { gen: Generated; onRegenerate: (note: string) => void; onFinish: (caption: string) => Promise<void>; onBack: () => void }) {
  return null;
}
