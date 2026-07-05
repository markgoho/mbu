import type { PublicUniversityResponse } from "../schemas/public-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

/**
 * Public, unauthenticated event read. Only a `published` university resolves;
 * every other status 404s with an identical body (see the service). The plugin
 * marks the response no-store so link-shared reads are never cached.
 */
export function getPublicUniversityLogic({
  universitiesService,
  universityId,
}: {
  universitiesService: UniversitiesService;
  universityId: string;
}): Promise<PublicUniversityResponse> {
  return universitiesService.getPublic(universityId);
}
