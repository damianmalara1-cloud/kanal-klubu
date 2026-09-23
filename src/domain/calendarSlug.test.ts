import { describe, it, expect } from 'vitest';
import { teamSlug, slugMap } from './calendarSlug';

describe('slug', () => {
  it('polskie znaki i nawiasy → ascii-kebab', () => {
    expect(teamSlug('młodziczki (2011+)')).toBe('mlodziczki-2011');
    expect(teamSlug('Juniorki młodsze')).toBe('juniorki-mlodsze');
  });
  it('mapa slug→drużyna; kolizja rzuca', () => {
    expect(slugMap(['młodziczki (2011+)', 'juniorki']).get('juniorki')).toBe('juniorki');
    expect(() => slugMap(['Juniorki', 'juniorki!'])).toThrow(/kolizja/i);
  });
});
