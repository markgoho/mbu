import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

interface SetupOptions {
  open?: boolean;
  title?: string;
}

const MESSAGE = 'You are responsible for safeguarding and deleting this data.';

async function setup({
  open = true,
  title = 'Export contains youth information',
}: SetupOptions = {}) {
  const bound = { open };
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const { rerender } = await render(ConfirmDialog, {
    title,
    message: MESSAGE,
    confirmLabel: 'I understand, continue',
    onConfirm,
    onCancel,
    get open() {
      return bound.open;
    },
    set open(next) {
      bound.open = next;
    },
  });
  return { bound, onConfirm, onCancel, rerender, dialog: page.getByRole('alertdialog') };
}

describe('ConfirmDialog', () => {
  it('shows nothing while it is closed', async () => {
    const { dialog } = await setup({ open: false });

    await expect.element(dialog).not.toBeInTheDocument();
  });

  it('opens as a modal dialog with the title, the message and the two actions', async () => {
    const { dialog } = await setup();

    await expect.element(dialog).toBeVisible();
    // The modal state (top layer, inert page) has no accessible query.
    expect(dialog.element().matches(':modal')).toBe(true);
    await expect
      .element(dialog.getByRole('heading', { name: 'Export contains youth information' }))
      .toBeVisible();
    await expect.element(dialog.getByText(MESSAGE)).toBeVisible();
    await expect.element(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect
      .element(dialog.getByRole('button', { name: 'I understand, continue' }))
      .toBeVisible();
  });

  it('opens when the caller sets open after the first render', async () => {
    const { dialog, rerender } = await setup({ open: false });

    await rerender({ open: true });

    await expect.element(dialog).toBeVisible();
  });

  it('has the title as its accessible name', async () => {
    await setup();

    await expect
      .element(page.getByRole('alertdialog', { name: 'Export contains youth information' }))
      .toBeVisible();
  });

  it('has the message as its accessible name when there is no title', async () => {
    await setup({ title: '' });

    await expect.element(page.getByRole('alertdialog', { name: MESSAGE })).toBeVisible();
    await expect.element(page.getByRole('heading')).not.toBeInTheDocument();
  });

  it('calls onConfirm and closes when the user confirms', async () => {
    const { bound, dialog, onConfirm, onCancel } = await setup();

    await dialog.getByRole('button', { name: 'I understand, continue' }).click();

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(bound.open).toBe(false);
    await expect.element(dialog).not.toBeInTheDocument();
  });

  it('calls onCancel and closes when the user cancels', async () => {
    const { bound, dialog, onConfirm, onCancel } = await setup();

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(bound.open).toBe(false);
    await expect.element(dialog).not.toBeInTheDocument();
  });

  it('calls onCancel and closes when the user presses Escape', async () => {
    const { bound, dialog, onConfirm, onCancel } = await setup();

    await userEvent.keyboard('{Escape}');

    await expect.element(dialog).not.toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(bound.open).toBe(false);
  });

  it('calls onCancel and closes when the user clicks the backdrop', async () => {
    const { bound, dialog, onCancel } = await setup();

    // A point of the page that is not in the dialog box, which is in the center.
    await userEvent.click(document.documentElement, { position: { x: 5, y: 5 }, force: true });

    await expect.element(dialog).not.toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(bound.open).toBe(false);
  });

  it('does not call onCancel when the caller closes it', async () => {
    const { dialog, onCancel, rerender } = await setup();

    await rerender({ open: false });

    await expect.element(dialog).not.toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
