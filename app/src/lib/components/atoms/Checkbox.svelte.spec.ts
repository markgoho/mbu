import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Checkbox from './Checkbox.svelte';

async function setup({
  checked = false,
  ...properties
}: Partial<ComponentProps<typeof Checkbox>> = {}) {
  const bound = { checked };
  await render(Checkbox, {
    'aria-label': 'I agree to the Terms',
    ...properties,
    get checked() {
      return bound.checked;
    },
    set checked(next) {
      bound.checked = next;
    },
  });
  return { bound, checkbox: page.getByRole('checkbox', { name: 'I agree to the Terms' }) };
}

describe('Checkbox', () => {
  it('is a checkbox that is not checked at the start', async () => {
    const { checkbox } = await setup();

    await expect.element(checkbox).not.toBeChecked();
  });

  it('shows the bound state', async () => {
    const { checkbox } = await setup({ checked: true });

    await expect.element(checkbox).toBeChecked();
  });

  it('passes attributes to the native input', async () => {
    const { checkbox } = await setup({ name: 'acceptedTerms', required: true });

    await expect.element(checkbox).toHaveAttribute('name', 'acceptedTerms');
    await expect.element(checkbox).toBeRequired();
  });

  it('gives the new state to the bound value when the user clicks it', async () => {
    const { bound, checkbox } = await setup();

    await checkbox.click();

    expect(bound.checked).toBe(true);
  });

  it('calls onchange when the user clicks it', async () => {
    const onchange = vi.fn();
    const { checkbox } = await setup({ onchange });

    await checkbox.click();

    expect(onchange).toHaveBeenCalledOnce();
  });
});
