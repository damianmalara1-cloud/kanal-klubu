import { describe, it, expect } from 'vitest';
import type { AppEvent } from '@/events/types';
import type { PostForm } from '@/domain/types';
import { aiVersions, formEntries, postCostUsd } from './postView';

const ev = (over: Partial<AppEvent>): AppEvent =>
  ({ id: 'x', at: '2026-09-22T10:00:00.000Z', type: 'ai_generated', author: 'Ania', postId: 'p1', costUsd: null, meta: {}, content: null, ...over });

describe('postView', () => {
  it('formEntries: etykiety pól po polsku, pomija puste, łączy listy', () => {
    const form = { names: ['Zuzanna Kowalska', 'Ola Nowak'], kind: 'kadra', team: null, details: '' } as unknown as PostForm;
    expect(formEntries(form)).toEqual([['Imię i nazwisko', 'Zuzanna Kowalska, Ola Nowak'], ['Co się wydarzyło', 'kadra']]);
  });

  it('aiVersions: tylko udane generacje, treść albo null po retencji', () => {
    const v = aiVersions([
      ev({ meta: { regenNo: 0 }, content: { note: null, caption: 'Wersja 1' }, costUsd: 0.003 }),
      ev({ type: 'ai_failed', meta: { reason: 'timeout' } }),
      ev({ meta: { regenNo: 1 }, content: null, costUsd: 0.002 }),
    ]);
    expect(v).toEqual([
      { at: '2026-09-22T10:00:00.000Z', regenNo: 0, note: null, caption: 'Wersja 1', costUsd: 0.003 },
      { at: '2026-09-22T10:00:00.000Z', regenNo: 1, note: null, caption: null, costUsd: 0.002 },
    ]);
  });

  it('postCostUsd: suma kosztów generacji udanych i nieudanych', () => {
    expect(postCostUsd([ev({ costUsd: 0.003 }), ev({ type: 'ai_failed', costUsd: 0.001 }), ev({ type: 'finished' })])).toBe(0.004);
  });
});
