import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import type { ClassChangeNotifier } from "../services/class-change-notifier/interface.js";
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
  /**
   * Port seam for #108: no-op today because classes can only be
   * cancelled/changed in `draft` status, which never has real recipients.
   */
  classChangeNotifier: ClassChangeNotifier;
  /** Token verifier used by the requireAuth resolver (fakeable in tests). */
  verifyToken: TokenVerifier;
}

export type PartialUniversitiesApiServices = Partial<UniversitiesApiServices>;
