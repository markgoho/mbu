import { describe, expect, it } from 'vitest';
import { DISCLAIMER_TEXT, DISCLAIMER_VERSION } from '#lib/disclaimer.js';

describe('disclaimer constants', () => {
  it('has a stable version string', () => {
    expect(DISCLAIMER_VERSION).toBe('2026-07-03');
  });

  it('includes not-verified wording', () => {
    expect(DISCLAIMER_TEXT).toContain('not been verified by Scouting America');
  });
});
