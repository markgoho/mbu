// Placeholder spec: it proves that the `server` (node) Vitest project runs,
// with the timezone that vite.config.ts sets. Delete it when real specs exist.
import { describe, expect, it } from 'vitest';

describe('server project timezone', () => {
  it('is America/New_York', () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York');
  });
});
