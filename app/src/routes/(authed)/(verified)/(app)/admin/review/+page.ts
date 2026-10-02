import type { ReviewQueueResponse } from '#lib/api-types/universities-api.types.js';
import { apiFetchNoRedirect } from '#lib/api.js';
import { failLoad } from '#lib/loadFailure.js';
import { getReviewQueue } from '#lib/universities.js';
import type { PageLoad } from './$types';

/**
 * The universities that wait for review.
 *
 * The `admin` guard has checked the `superAdmin` claim of the ID token. The API
 * checks it again and answers 403 when the claim was removed after the token
 * was made: the user then goes to the app home, as the guard does.
 */
export const load: PageLoad = async ({ parent }) => {
  await parent();

  let reviewQueue: ReviewQueueResponse;
  try {
    reviewQueue = await getReviewQueue(apiFetchNoRedirect);
  } catch (queueError) {
    failLoad(queueError, { fallback: 'Could not load the review queue.', forbidden: 'home' });
  }
  return { universities: reviewQueue.universities };
};
