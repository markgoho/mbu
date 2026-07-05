import { Elysia } from "elysia";
import { getPublicUniversityLogic } from "../routes/public-university.js";
import { PublicUniversityResponseSchema } from "../schemas/public-schemas.js";
import { UniversitiesServiceImpl } from "../services/universities/index.js";
import type { PartialUniversitiesApiServices } from "../types/services.js";

/**
 * Public event read plugin — deliberately registered WITHOUT the requireAuth
 * resolver so link-only access works for signed-out visitors. Only a
 * `published` university resolves; anything else 404s (see the service).
 */
export function createUniversitiesPublicPlugin(
  services?: PartialUniversitiesApiServices,
) {
  const universities = services?.universitiesService ?? UniversitiesServiceImpl;

  return new Elysia({ name: "universities-public" }).get(
    "/universities/:id/public",
    ({ params, set }) => {
      set.headers["cache-control"] = "no-store";
      return getPublicUniversityLogic({
        universitiesService: universities,
        universityId: params.id,
      });
    },
    { response: PublicUniversityResponseSchema },
  );
}
