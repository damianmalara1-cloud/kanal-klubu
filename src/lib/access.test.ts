import { describe, it, expect, vi } from 'vitest';
import { testConfig } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachLinkSecret: 'abcdefghijklmnop' }) }));
import { isValidSecret, clientIp } from './access';
describe('access', () => {
  it('sekret', () => { expect(isValidSecret('abcdefghijklmnop')).toBe(true); expect(isValidSecret('abcdefghijklmnoP')).toBe(false); expect(isValidSecret('')).toBe(false); });
  it('ip z x-forwarded-for', () => { expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4'); expect(clientIp(new Headers())).toBeNull(); });
});
