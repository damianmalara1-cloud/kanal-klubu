import { describe, it, expect } from 'vitest';
import { checkFacts } from './factGuard';
import type { Post } from '@/domain/types';
const mk = (type: string, form: unknown) => ({ type, form } as unknown as Post);
describe('checkFacts', () => {
  it('mecz: brak wyniku w tekście', () => {
    const p = mk('mecz', { opponent: 'X', scoreHome: 24, scoreAway: 18 });
    expect(checkFacts(p, 'Wygrana 24 : 18 z X')).toBeNull();
    expect(checkFacts(p, 'Wygrana 24 : 17')).toMatch(/18/);
  });
  it('sukces: nazwisko musi wystąpić', () => {
    const p = mk('sukces', { names: ['Zuzanna Kowalska'], kind: 'kadra' });
    expect(checkFacts(p, 'Zuzanna Kowalska w kadrze')).toBeNull();
    expect(checkFacts(p, 'Nasza zawodniczka w kadrze')).toMatch(/Kowalska/);
  });
  it('sukces: dopasowanie po rdzeniach toleruje polską odmianę', () => {
    const p = mk('sukces', { names: ['Zuzanna Kowalska'], kind: 'kadra' });
    expect(checkFacts(p, 'Gratulacje dla Zuzanny Kowalskiej')).toBeNull();
    expect(checkFacts(p, 'Gratulacje dla naszej zawodniczki')).toMatch(/Kowalska/);
  });
  it('inne typy: brak kontroli', () => expect(checkFacts(mk('ogloszenie', { title: 'a', body: 'b' }), 'x')).toBeNull());
});
