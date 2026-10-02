import type { HealthResponse } from '#lib/api-types/health-api.types.js';
import { getJson } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';

/**
`GET /api/health`: the health check of the API. It needs no sign-in.
*/
export function getHealth(fetcher: Fetcher): Promise<HealthResponse> {
  return getJson<HealthResponse>(fetcher, '/api/health');
}
