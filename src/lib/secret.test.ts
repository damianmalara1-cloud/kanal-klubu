import { describe, it, expect } from 'vitest';
import { safeEqual } from './secret';
describe('safeEqual', () => {
  it('równe', () => expect(safeEqual('abc', 'abc')).toBe(true));
  it('różne długości', () => expect(safeEqual('abc', 'abcd')).toBe(false));
  it('różne', () => expect(safeEqual('abc', 'abd')).toBe(false));
});
