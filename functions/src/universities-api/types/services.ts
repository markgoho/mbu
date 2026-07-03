import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import type { ClassesService } from "../services/classes/interface.js";
import type { PeriodsService } from "../services/periods/interface.js";
import type { UniversitiesService } from "../services/universities/interface.js";

/**
 * Injectable dependencies for the universities-api app. Tests override any subset;
 * production uses the live defaults wired in app.ts.
 */
export interface UniversitiesApiServices {
  universitiesService: UniversitiesService;
  periodsService: PeriodsService;
  classesService: ClassesService;
  /** Token verifier used by the requireAuth resolver (fakeable in tests). */
  verifyToken: TokenVerifier;
}

export type PartialUniversitiesApiServices = Partial<UniversitiesApiServices>;
