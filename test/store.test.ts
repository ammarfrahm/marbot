import { describe, expect, it } from 'vitest';
import { storeKey } from '../src/lib/store';

// Saved data lives under these names; changing them would silently drop every user's city and cached months.
describe('storeKey', () => {
  it('keeps the legacy prefix', () => {
    expect(storeKey('city')).toBe('bedug:city');
    expect(storeKey('source')).toBe('bedug:source');
  });
  it('joins a cached month the way it was always saved', () => expect(storeKey('myquran', '1301', '2026-11')).toBe('bedug:myquran:1301:2026-11'));
});
