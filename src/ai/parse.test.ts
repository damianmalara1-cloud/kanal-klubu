import { describe, it, expect } from 'vitest';
import { parseModelJson } from './parse';
describe('parseModelJson', () => {
  it('czysty JSON', () => expect(parseModelJson('{"caption":"a","headline":"b","kicker":"c"}')).toEqual({ caption: 'a', headline: 'b', kicker: 'c' }));
  it('JSON w płotkach z tekstem dookoła', () => expect(parseModelJson('Oto:\n```json\n{"caption":"a","headline":"b","kicker":"c"}\n```')).toEqual({ caption: 'a', headline: 'b', kicker: 'c' }));
  it('przycina headline do 24 i kicker do 30 znaków', () => {
    const r = parseModelJson(JSON.stringify({ caption: 'x', headline: 'A'.repeat(40), kicker: 'B'.repeat(40) }));
    expect(r.headline).toHaveLength(24); expect(r.kicker).toHaveLength(30);
  });
  it('rzuca gdy brak caption', () => expect(() => parseModelJson('{"headline":"b"}')).toThrow());
});
