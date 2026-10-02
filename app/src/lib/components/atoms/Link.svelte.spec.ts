import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { htmlSnippet } from '../testSnippet.js';
import Link from './Link.svelte';

async function setup(properties: Partial<ComponentProps<typeof Link>> = {}) {
  await render(Link, {
    href: '/universities',
    children: htmlSnippet('<span>Manage Universities</span>'),
    ...properties,
  });
  return { link: page.getByRole('link', { name: 'Manage Universities' }) };
}

describe('Link', () => {
  it('is a link to the href, with its content as the accessible name', async () => {
    const { link } = await setup();

    await expect.element(link).toHaveAttribute('href', '/universities');
  });

  it('passes attributes to the native anchor', async () => {
    const { link } = await setup({ class: 'dashboard__create', 'aria-current': 'page' });

    await expect.element(link).toHaveClass('dashboard__create');
    await expect.element(link).toHaveAttribute('aria-current', 'page');
  });

  it('calls onclick when the user clicks it', async () => {
    // The handler stops the navigation, so that the spec page stays loaded.
    const onclick = vi.fn((event: MouseEvent) => event.preventDefault());
    const { link } = await setup({ onclick });

    await link.click();

    expect(onclick).toHaveBeenCalledOnce();
  });
});
