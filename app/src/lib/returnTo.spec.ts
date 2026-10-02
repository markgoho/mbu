import { describe, expect, it } from 'vitest';
import { safeReturnTo } from '#lib/returnTo.js';

describe('safeReturnTo', () => {
  it.each([
    { name: 'an in-app path', query: 'returnTo=%2Fsettings', expected: '/settings' },
    {
      name: 'an in-app path with its own query',
      query: 'returnTo=%2Fe%2Fabc%2Fregister%3Fclass%3D1',
      expected: '/e/abc/register?class=1',
    },
    { name: 'no returnTo parameter', query: '', expected: '/' },
    { name: 'an empty returnTo parameter', query: 'returnTo=', expected: '/' },
    { name: 'a protocol-relative URL', query: 'returnTo=%2F%2Fevil.com', expected: '/' },
    { name: 'an absolute URL', query: 'returnTo=https%3A%2F%2Fevil.com%2F', expected: '/' },
    { name: 'a relative path', query: 'returnTo=settings', expected: '/' },
  ])('gives $expected for $name', ({ query, expected }) => {
    expect(safeReturnTo(new URLSearchParams(query))).toBe(expected);
  });
});
