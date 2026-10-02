import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { htmlSnippet } from '../testSnippet.js';
import Select from './Select.svelte';

// A raw snippet is one element, so the options are in one group.
const options = htmlSnippet(
  '<optgroup label="Badges"><option value="camping">Camping</option><option value="hiking">Hiking</option></optgroup>',
);

async function setup(properties: Partial<ComponentProps<typeof Select>> = {}) {
  const bound = { value: 'camping' as unknown };
  await render(Select, {
    'aria-label': 'Merit badge',
    children: options,
    ...properties,
    get value() {
      return bound.value;
    },
    set value(next) {
      bound.value = next;
    },
  });
  return { bound, select: page.getByRole('combobox', { name: 'Merit badge' }) };
}

describe('Select', () => {
  it('is a combo box that shows its options and the bound value', async () => {
    const { select } = await setup();

    await expect.element(select).toHaveValue('camping');
    await expect.element(page.getByRole('option', { name: 'Hiking' })).toBeInTheDocument();
  });

  it('passes attributes to the native select', async () => {
    const { select } = await setup({ name: 'badgeSlug', disabled: true });

    await expect.element(select).toHaveAttribute('name', 'badgeSlug');
    await expect.element(select).toBeDisabled();
  });

  it('gives the option that the user selects to the bound value', async () => {
    const { bound, select } = await setup();

    await select.selectOptions('hiking');

    expect(bound.value).toBe('hiking');
  });

  it('calls onchange when the user selects an option', async () => {
    const onchange = vi.fn();
    const { select } = await setup({ onchange });

    await select.selectOptions('hiking');

    expect(onchange).toHaveBeenCalledOnce();
  });
});
