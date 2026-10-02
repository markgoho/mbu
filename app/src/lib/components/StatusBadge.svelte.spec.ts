import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { UniversityStatus } from '#lib/api-types/universities-api.types.js';
import StatusBadge from './StatusBadge.svelte';

const STATUSES: UniversityStatus[] = [
  'draft',
  'submitted',
  'needs_review',
  'published',
  'closed',
  'rejected',
];

describe('StatusBadge', () => {
  it.each(STATUSES)('shows the label of the %s status', async (status) => {
    await render(StatusBadge, { status });

    await expect.element(page.getByText(status, { exact: true })).toBeVisible();
  });
});
