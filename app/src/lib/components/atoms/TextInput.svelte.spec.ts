import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import TextInput from './TextInput.svelte';

async function setup(properties: Partial<ComponentProps<typeof TextInput>> = {}) {
  const bound = { value: '' as unknown };
  await render(TextInput, {
    'aria-label': 'Title',
    ...properties,
    get value() {
      return bound.value;
    },
    set value(next) {
      bound.value = next;
    },
  });
  return { bound };
}

describe('TextInput', () => {
  it('is a text box with the name that the caller gives', async () => {
    await setup();

    await expect
      .element(page.getByRole('textbox', { name: 'Title' }))
      .toHaveAttribute('type', 'text');
  });

  it('passes attributes to the native input', async () => {
    await setup({ type: 'email', autocomplete: 'email', required: true });

    const input = page.getByRole('textbox', { name: 'Title' });
    await expect.element(input).toHaveAttribute('type', 'email');
    await expect.element(input).toHaveAttribute('autocomplete', 'email');
    await expect.element(input).toBeRequired();
  });

  it('gives the text that the user types to the bound value', async () => {
    const { bound } = await setup();

    await page.getByRole('textbox', { name: 'Title' }).fill('Winter University');

    expect(bound.value).toBe('Winter University');
  });

  it('gives a number to the bound value when the type is number', async () => {
    const { bound } = await setup({ type: 'number' });

    await page.getByRole('spinbutton', { name: 'Title' }).fill('12');

    expect(bound.value).toBe(12);
  });

  it('calls oninput when the user types', async () => {
    const oninput = vi.fn();
    await setup({ oninput });

    await page.getByRole('textbox', { name: 'Title' }).fill('A');

    expect(oninput).toHaveBeenCalledOnce();
  });

  it('calls onclick when the user clicks it', async () => {
    const onclick = vi.fn();
    await setup({ onclick });

    await page.getByRole('textbox', { name: 'Title' }).click();

    expect(onclick).toHaveBeenCalledOnce();
  });
});
