import { signal } from '@angular/core';

/**
 * Minimal stand-in for Angular's `httpResource`, backed by writable signals so
 * a component's `computed()`/`effect()` react to it the same way they would to
 * the real resource. Use this to mock service-level resources in component
 * tests instead of reaching for `HttpTestingController` — the service is the
 * boundary under test, not the transport it happens to use internally.
 */
export function fakeResource<T>(initial?: T) {
  const valueSignal = signal<T | undefined>(initial);
  const errorSignal = signal<unknown>(undefined);
  const isLoadingSignal = signal(false);

  return {
    value: valueSignal.asReadonly(),
    error: errorSignal.asReadonly(),
    isLoading: isLoadingSignal.asReadonly(),
    reload: (): void => {
      /* no-op in tests; call `set`/`setError` to change what the resource reports */
    },
    set(next: T): void {
      errorSignal.set(undefined);
      valueSignal.set(next);
    },
    setError(next: unknown): void {
      valueSignal.set(undefined);
      errorSignal.set(next);
    },
  };
}
