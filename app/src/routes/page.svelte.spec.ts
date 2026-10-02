// Placeholder spec: it proves that the `client` (browser) Vitest project runs.
// Delete it when real component specs exist.
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('placeholder page', () => {
  it('shows the app name as the heading', async () => {
    await render(Page);

    await expect
      .element(page.getByRole('heading', { name: 'Merit Badge University Platform' }))
      .toBeVisible();
  });
});
