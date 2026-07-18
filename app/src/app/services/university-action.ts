import { signal } from '@angular/core';

export interface UniversityAction {
  readonly pending: ReturnType<typeof signal<boolean>>;
  readonly error: ReturnType<typeof signal<string>>;
  run(options: UniversityActionOptions): Promise<void>;
}

interface UniversityActionOptions {
  readonly action: () => Promise<unknown>;
  readonly fallback: string;
  readonly confirm?: string;
  readonly onSuccess?: () => Promise<unknown> | void;
}

export function createUniversityAction(
  translateError: (error: unknown, fallback: string) => string,
): UniversityAction {
  const pending = signal(false);
  const error = signal('');

  return {
    pending,
    error,
    async run({ action, fallback, confirm, onSuccess }: UniversityActionOptions): Promise<void> {
      if (pending() || (confirm && !globalThis.confirm(confirm))) return;

      error.set('');
      pending.set(true);
      try {
        await action();
        await onSuccess?.();
      } catch (cause) {
        error.set(translateError(cause, fallback));
      } finally {
        pending.set(false);
      }
    },
  };
}
