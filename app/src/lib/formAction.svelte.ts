import { apiErrorMessage } from '#lib/apiErrorMessage.js';

export interface FormActionOptions {
  /**
  The work to do, usually one call to a domain module.
  */
  readonly action: () => Promise<unknown>;
  /**
  The message to show when the failure has no message of its own.
  */
  readonly fallback: string;
  /**
  A question for `globalThis.confirm`. If the user declines, nothing runs.
  */
  readonly confirm?: string;
  /**
  Runs after `action` is successful. `pending` stays `true` until it is complete.
  */
  readonly onSuccess?: () => Promise<unknown> | void;
}

/**
 * The state of one action of a form or a button: whether it is in progress and
 * the message of its last failure. A component makes one instance and reads
 * `pending` and `error` in its template.
 */
export class FormAction {
  pending = $state(false);
  error = $state('');

  /**
   * Runs one action. A call while a different one is in progress does nothing
   * (the guard for a double click). A failure of `action` or of `onSuccess`
   * does not throw: it sets `error`, translated with `apiErrorMessage`.
   */
  async run({ action, fallback, confirm, onSuccess }: FormActionOptions): Promise<void> {
    if (this.pending || (confirm && !globalThis.confirm(confirm))) return;

    this.error = '';
    this.pending = true;
    try {
      await action();
      await onSuccess?.();
    } catch (error) {
      this.error = apiErrorMessage(error, fallback);
    } finally {
      this.pending = false;
    }
  }
}
