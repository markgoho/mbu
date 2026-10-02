// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageData {
      /**
       * The account of the signed-in user. The `(app)` layout load sets it, so
       * it is present on each route in that group and absent on all others.
       */
      session?: BootstrapResponse;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
