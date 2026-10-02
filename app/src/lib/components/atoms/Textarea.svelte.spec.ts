import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Textarea from './Textarea.svelte';

async function setup(properties: Partial<ComponentProps<typeof Textarea>> = {}) {
  const bound: { value: ComponentProps<typeof Textarea>['value'] } = { value: 'First draft' };
  await render(Textarea, {
    'aria-label': 'Notes',
    ...properties,
    get value() {
      return bound.value;
    },
    set value(next) {
      bound.value = next;
    },
  });
  return { bound, textarea: page.getByRole('textbox', { name: 'Notes' }) };
}

describe('Textarea', () => {
  it('is a text box that shows the bound value', async () => {
    const { textarea } = await setup();

    await expect.element(textarea).toHaveValue('First draft');
  });

  it('passes attributes to the native textarea', async () => {
    const { textarea } = await setup({ rows: 2, required: true });

    await expect.element(textarea).toHaveAttribute('rows', '2');
    await expect.element(textarea).toBeRequired();
  });

  it('gives the text that the user types to the bound value', async () => {
    const { bound, textarea } = await setup();

    await textarea.fill('Bring a pocketknife.');

    expect(bound.value).toBe('Bring a pocketknife.');
  });

  it('calls oninput when the user types', async () => {
    const oninput = vi.fn();
    const { textarea } = await setup({ oninput });

    await textarea.fill('A');

    expect(oninput).toHaveBeenCalledOnce();
  });

  it('calls onclick when the user clicks it', async () => {
    const onclick = vi.fn();
    const { textarea } = await setup({ onclick });

    await textarea.click();

    expect(onclick).toHaveBeenCalledOnce();
  });
});
