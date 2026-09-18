import { describe, expect, it } from 'vitest';
import { digestUrl, normalizeUrl } from '../src/shared/url';

describe('page identity', () => {
  it('sorts query parameters and excludes fragments', () => {
    expect(normalizeUrl('https://example.com/note?z=2&a=1#selection')).toBe('https://example.com/note?a=1&z=2');
  });

  it('creates the same digest for equivalent URLs', async () => {
    await expect(digestUrl('https://example.com/?b=2&a=1#x')).resolves.toBe(await digestUrl('https://example.com/?a=1&b=2#y'));
  });
});

