/**
 * The universities API: the events of a chancellor, their periods and classes,
 * the public view of a published event, and the review queue of a super admin.
 *
 * Each function is one request. It takes the `Fetcher` first: a `load` passes
 * `apiFetchNoRedirect`, a component passes `apiFetch`. A response that is not OK
 * throws an `ApiError`. The module keeps no state: the route owns its read (in a
 * `load`) and loads it again with `invalidate` / `invalidateAll` after a write.
 */
import type {
  BadgeCatalogResponse,
  ClassCreateRequest,
  ClassPatchRequest,
  ClassResponse,
  PeriodsPutRequest,
  PeriodsResponse,
  PublicUniversity,
  ReviewQueueResponse,
  UniversityCreateRequest,
  UniversityDetailResponse,
  UniversityListResponse,
  UniversityPatchRequest,
  UniversityResponse,
} from '#lib/api-types/universities-api.types.js';
import { expectOk, getJson, sendJson } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';

const UNIVERSITIES_PATH = '/api/universities';
const ADMIN_UNIVERSITIES_PATH = '/api/admin/universities';

function universityPath(id: string): string {
  return `${UNIVERSITIES_PATH}/${id}`;
}

function classPath(universityId: string, classId: string): string {
  return `${universityPath(universityId)}/classes/${classId}`;
}

// Reads

/**
`GET /api/universities/mine`: the universities that the signed-in user owns.
*/
export function listMine(fetcher: Fetcher): Promise<UniversityListResponse> {
  return getJson<UniversityListResponse>(fetcher, `${UNIVERSITIES_PATH}/mine`);
}

/**
`GET /api/universities/badges`: the merit badge catalog for the class form.
*/
export function listBadges(fetcher: Fetcher): Promise<BadgeCatalogResponse> {
  return getJson<BadgeCatalogResponse>(fetcher, `${UNIVERSITIES_PATH}/badges`);
}

/**
 * `GET /api/universities/:id`: the university with its periods and classes, for
 * its owner or a super admin. The API answers 403 for a different user.
 */
export function getUniversity(fetcher: Fetcher, id: string): Promise<UniversityDetailResponse> {
  return getJson<UniversityDetailResponse>(fetcher, universityPath(id));
}

/**
`GET /api/universities/:id/public`: the parent-facing view of a published event.
*/
export function getPublicUniversity(fetcher: Fetcher, id: string): Promise<PublicUniversity> {
  return getJson<PublicUniversity>(fetcher, `${universityPath(id)}/public`);
}

/**
`GET /api/admin/universities/review-queue`: the events that wait for review. Super admin only.
*/
export function getReviewQueue(fetcher: Fetcher): Promise<ReviewQueueResponse> {
  return getJson<ReviewQueueResponse>(fetcher, `${ADMIN_UNIVERSITIES_PATH}/review-queue`);
}

// Writes: the university

/**
`POST /api/universities`.
*/
export function createUniversity(
  fetcher: Fetcher,
  body: UniversityCreateRequest,
): Promise<UniversityResponse> {
  return sendJson<UniversityResponse>(fetcher, 'POST', UNIVERSITIES_PATH, body);
}

/**
`PATCH /api/universities/:id`.
*/
export function patchUniversity(
  fetcher: Fetcher,
  id: string,
  body: UniversityPatchRequest,
): Promise<UniversityResponse> {
  return sendJson<UniversityResponse>(fetcher, 'PATCH', universityPath(id), body);
}

/**
`DELETE /api/universities/:id`. The API answers 204.
*/
export async function deleteUniversity(fetcher: Fetcher, id: string): Promise<void> {
  await expectOk(await fetcher(universityPath(id), { method: 'DELETE' }));
}

/**
`POST /api/universities/:id/submit`: sends the university to review.
*/
export function submitUniversity(fetcher: Fetcher, id: string): Promise<UniversityResponse> {
  return sendJson<UniversityResponse>(fetcher, 'POST', `${universityPath(id)}/submit`, {});
}

/**
`POST /api/universities/:id/close`: closes a published event.
*/
export function closeUniversity(fetcher: Fetcher, id: string): Promise<UniversityResponse> {
  return sendJson<UniversityResponse>(fetcher, 'POST', `${universityPath(id)}/close`, {});
}

// Writes: periods and classes

/**
`PUT /api/universities/:id/periods`: replaces all periods of the university.
*/
export function putPeriods(
  fetcher: Fetcher,
  id: string,
  body: PeriodsPutRequest,
): Promise<PeriodsResponse> {
  return sendJson<PeriodsResponse>(fetcher, 'PUT', `${universityPath(id)}/periods`, body);
}

/**
`POST /api/universities/:universityId/classes`.
*/
export function createClass(
  fetcher: Fetcher,
  universityId: string,
  body: ClassCreateRequest,
): Promise<ClassResponse> {
  return sendJson<ClassResponse>(fetcher, 'POST', `${universityPath(universityId)}/classes`, body);
}

/**
`PATCH /api/universities/:universityId/classes/:classId`.
*/
export function patchClass(
  fetcher: Fetcher,
  universityId: string,
  classId: string,
  body: ClassPatchRequest,
): Promise<ClassResponse> {
  return sendJson<ClassResponse>(fetcher, 'PATCH', classPath(universityId, classId), body);
}

/**
`DELETE /api/universities/:universityId/classes/:classId`. The API answers 204.
*/
export async function deleteClass(
  fetcher: Fetcher,
  universityId: string,
  classId: string,
): Promise<void> {
  await expectOk(await fetcher(classPath(universityId, classId), { method: 'DELETE' }));
}

// Writes: review (super admin only)

/**
`POST /api/admin/universities/:id/approve`.
*/
export function approveUniversity(fetcher: Fetcher, id: string): Promise<UniversityResponse> {
  return sendJson<UniversityResponse>(
    fetcher,
    'POST',
    `${ADMIN_UNIVERSITIES_PATH}/${id}/approve`,
    {},
  );
}

/**
`POST /api/admin/universities/:id/reject` with the body `{ note }`.
*/
export function rejectUniversity(
  fetcher: Fetcher,
  id: string,
  note: string,
): Promise<UniversityResponse> {
  return sendJson<UniversityResponse>(fetcher, 'POST', `${ADMIN_UNIVERSITIES_PATH}/${id}/reject`, {
    note,
  });
}
