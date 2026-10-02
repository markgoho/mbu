/**
 * The mapping of a failed read in the `load` of a route to a redirect or to the
 * error page, and the "denied" flag that the universities dashboard shows.
 *
 * The API answers 403 for a university that the user does not own. The `load`
 * then goes to `/universities?denied=<reason>`, and the dashboard `load` gives
 * the message of that reason to its page.
 *
 * The API also answers 403 for a read of a super admin when the user has no
 * `superAdmin` claim. That `load` goes to the app home, with no message.
 */
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ApiError } from '#lib/api.js';
import { apiErrorMessage } from '#lib/apiErrorMessage.js';

/**
The name of the query parameter of the dashboard that holds a `DeniedReason`.
*/
export const DENIED_PARAMETER = 'denied';

const DENIED_MESSAGES = {
  university: 'You do not have access to that university.',
  roster: 'You do not have access to those rosters.',
} as const;

/**
What the user could not open: the editor of a university, or its rosters.
*/
export type DeniedReason = keyof typeof DENIED_MESSAGES;

function isDeniedReason(value: string): value is DeniedReason {
  return Object.hasOwn(DENIED_MESSAGES, value);
}

/**
The message for the value of the `denied` query parameter, if the value is a `DeniedReason`.
*/
export function deniedMessage(parameterValue: string | null): string | undefined {
  return parameterValue !== null && isDeniedReason(parameterValue)
    ? DENIED_MESSAGES[parameterValue]
    : undefined;
}

export interface FailLoadOptions {
  /**
  The message of the error page when the failure has no message of its own.
  */
  readonly fallback: string;
  /**
  If set, a 403 goes to the dashboard with the message of this reason. Do not give it together with `forbidden`: `denied` is then the one that applies.
  */
  readonly denied?: DeniedReason;
  /**
  If `home`, a 403 goes to the app home with no message. This is for a read of a super admin: the API answers 403 when the user has no `superAdmin` claim now.
  */
  readonly forbidden?: 'home';
}

/**
 * Ends a `load` after a read failed. Call it in the `catch` block of the read,
 * which used `apiFetchNoRedirect`.
 *
 * - 401: `apiFetchNoRedirect` has signed the user out, so the `load` goes to `/sign-in`.
 * - 403, when `denied` is set: goes to the dashboard with the "denied" flag.
 * - 403, when `forbidden` is `home`: goes to the app home, as the `admin` guard does.
 * - All other failures: the error page, with the status and the message of the
 *   API. A failure that is not an `ApiError` (the network) gives 503 and `fallback`.
 */
export function failLoad(
  loadError: unknown,
  { fallback, denied, forbidden }: FailLoadOptions,
): never {
  if (loadError instanceof ApiError) {
    if (loadError.status === 401) redirect(303, resolve('/(signed-out)/sign-in'));
    if (denied && loadError.status === 403) {
      redirect(
        303,
        `${resolve('/(authed)/(verified)/(app)/universities')}?${DENIED_PARAMETER}=${denied}`,
      );
    }
    if (forbidden === 'home' && loadError.status === 403) {
      redirect(303, resolve('/(authed)/(verified)/(app)'));
    }
    error(loadError.status, apiErrorMessage(loadError, fallback));
  }
  error(503, fallback);
}
