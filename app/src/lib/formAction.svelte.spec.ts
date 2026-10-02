import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { ApiError } from '#lib/api.js';
import { FormAction } from '#lib/formAction.svelte.js';

/**
Replaces the confirm dialog of the browser with a fixed answer for one test.
*/
function answerConfirm(isAccepted: boolean) {
  const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(isAccepted);
  onTestFinished(() => confirmSpy.mockRestore());
  return confirmSpy;
}

describe('FormAction', () => {
  it('runs the action and then onSuccess, and is pending until they are complete', async () => {
    const formAction = new FormAction();
    const held = Promise.withResolvers<void>();
    const action = vi.fn(() => held.promise);
    const onSuccess = vi.fn();

    const run = formAction.run({ action, fallback: 'Could not save.', onSuccess });

    expect(formAction.pending).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    held.resolve();
    await run;

    expect(action).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(formAction.pending).toBe(false);
    expect(formAction.error).toBe('');
  });

  it('shows the message of the API for a failed action, and does not run onSuccess', async () => {
    const formAction = new FormAction();
    const onSuccess = vi.fn();

    await formAction.run({
      action: () => Promise.reject(new ApiError(409, { error: 'This class is full.' })),
      fallback: 'Could not save.',
      onSuccess,
    });

    expect(formAction.error).toBe('This class is full.');
    expect(formAction.pending).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows the fallback for a failure that is not an API error', async () => {
    const formAction = new FormAction();

    await formAction.run({
      action: () => Promise.reject(new TypeError('Failed to fetch')),
      fallback: 'Could not save.',
    });

    expect(formAction.error).toBe('Could not save.');
  });

  it('shows the fallback when onSuccess fails', async () => {
    const formAction = new FormAction();

    await formAction.run({
      action: () => Promise.resolve(),
      fallback: 'Could not save.',
      onSuccess: () => Promise.reject(new Error('navigation failed')),
    });

    expect(formAction.error).toBe('Could not save.');
    expect(formAction.pending).toBe(false);
  });

  it('clears the error of the previous run when a new run starts', async () => {
    const formAction = new FormAction();
    await formAction.run({
      action: () => Promise.reject(new Error('first failure')),
      fallback: 'Could not save.',
    });
    const held = Promise.withResolvers<void>();

    const run = formAction.run({ action: () => held.promise, fallback: 'Could not save.' });

    expect(formAction.error).toBe('');
    held.resolve();
    await run;
  });

  it('ignores a second run while the first one is pending', async () => {
    const formAction = new FormAction();
    const held = Promise.withResolvers<void>();
    const secondAction = vi.fn(() => Promise.resolve());

    const firstRun = formAction.run({ action: () => held.promise, fallback: 'Could not save.' });
    await formAction.run({ action: secondAction, fallback: 'Could not delete.' });

    expect(secondAction).not.toHaveBeenCalled();
    expect(formAction.pending).toBe(true);

    held.resolve();
    await firstRun;

    expect(formAction.pending).toBe(false);
  });

  it('does not run the action when the user declines the confirm question', async () => {
    const formAction = new FormAction();
    const confirmSpy = answerConfirm(false);
    const action = vi.fn(() => Promise.resolve());
    const onSuccess = vi.fn();

    await formAction.run({
      action,
      fallback: 'Could not delete this class.',
      confirm: 'Delete Camping?',
      onSuccess,
    });

    expect(confirmSpy).toHaveBeenCalledWith('Delete Camping?');
    expect(action).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(formAction.pending).toBe(false);
  });

  it('runs the action when the user accepts the confirm question', async () => {
    const formAction = new FormAction();
    answerConfirm(true);
    const action = vi.fn(() => Promise.resolve());

    await formAction.run({
      action,
      fallback: 'Could not delete this class.',
      confirm: 'Delete Camping?',
    });

    expect(action).toHaveBeenCalledOnce();
  });
});
