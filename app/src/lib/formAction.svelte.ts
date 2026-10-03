import { apiErrorMessage, apiFieldErrors } from '#lib/apiErrorMessage.js';

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
The ARIA attributes of the control of a field: they point to the message of the field.
*/
export interface FieldAttributes {
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/**
 * The state of one action of a form or a button: whether it is in progress,
 * the message of its last failure, and the message of each field at fault. A
 * component makes one instance and reads `pending`, `error` and the field
 * messages in its template.
 *
 * The field messages come from the `details` of an `INVALID_ARGUMENT` refusal,
 * keyed by the JSON name of the field (`location.city`). The form shows each
 * one beside its control (`FieldError.svelte`), and `error` keeps the message
 * of the refusal for the form.
 */
export class FormAction {
  #fieldErrors = $state.raw<Readonly<Record<string, string>>>({});
  readonly #idPrefix: string;
  pending = $state(false);
  error = $state('');

  /**
   * `idPrefix` makes the element IDs of the field messages unique on the page:
   * give the `$props.id()` of the component.
   */
  constructor(idPrefix = 'form') {
    this.#idPrefix = idPrefix;
  }

  /**
  The message of the field from the last failure, or `undefined`.
  */
  fieldError(field: string): string | undefined {
    return Object.hasOwn(this.#fieldErrors, field) ? this.#fieldErrors[field] : undefined;
  }

  /**
  The element ID of the message of the field.
  */
  fieldErrorId(field: string): string {
    return `${this.#idPrefix}-${field}-error`;
  }

  /**
  The ARIA attributes for the control of the field. Spread them on the control.
  */
  fieldAttributes(field: string): FieldAttributes {
    return this.fieldError(field) === undefined
      ? {}
      : { 'aria-invalid': true, 'aria-describedby': this.fieldErrorId(field) };
  }

  /**
   * Runs one action. A call while a different one is in progress does nothing
   * (the guard for a double click). A failure of `action` or of `onSuccess`
   * does not throw: it sets `error`, translated with `apiErrorMessage`, and the
   * field messages, from `apiFieldErrors`.
   */
  async run({ action, fallback, confirm, onSuccess }: FormActionOptions): Promise<void> {
    if (this.pending || (confirm && !globalThis.confirm(confirm))) return;

    this.error = '';
    this.#fieldErrors = {};
    this.pending = true;
    try {
      await action();
      await onSuccess?.();
    } catch (error) {
      this.error = apiErrorMessage(error, fallback);
      this.#fieldErrors = apiFieldErrors(error);
    } finally {
      this.pending = false;
    }
  }
}
