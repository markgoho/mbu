import type { ComponentProps } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { htmlSnippet } from '../testSnippet.js';
import Button from './Button.svelte';

async function setup(properties: Partial<ComponentProps<typeof Button>> = {}) {
  const onclick = vi.fn();
  await render(Button, { children: htmlSnippet('<span>Save</span>'), onclick, ...properties });
  return { onclick, button: page.getByRole('button', { name: 'Save' }) };
}

describe('Button', () => {
  it('is a button with its content as the accessible name', async () => {
    const { button } = await setup();

    await expect.element(button).toBeVisible();
  });

  it('has the button type when the caller gives no type', async () => {
    const { button } = await setup();

    await expect.element(button).toHaveAttribute('type', 'button');
  });

  it('passes attributes to the native button', async () => {
    const { button } = await setup({ type: 'submit', disabled: true, title: 'Not ready' });

    await expect.element(button).toHaveAttribute('type', 'submit');
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('title', 'Not ready');
  });

  it('calls onclick when the user clicks it', async () => {
    const { button, onclick } = await setup();

    await button.click();

    expect(onclick).toHaveBeenCalledOnce();
  });
});
