import { describe, expect, it } from 'vitest';

import { authDomainFor, PROJECT_AUTH_DOMAIN } from '#lib/authDomain.js';

describe('authDomainFor', () => {
  it.each(['mbu-platform.web.app', 'mbu-platform.firebaseapp.com'])(
    'uses the production host %s itself',
    (host) => {
      expect(authDomainFor(host)).toBe(host);
    },
  );

  it.each([
    'localhost:4200',
    'mbu-platform--pr-12-abc.web.app',
    'mbu-platform.web.app.evil.example',
  ])('keeps the project default on %s', (host) => {
    expect(authDomainFor(host)).toBe(PROJECT_AUTH_DOMAIN);
  });
});
