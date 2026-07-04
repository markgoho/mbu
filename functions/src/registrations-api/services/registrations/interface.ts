import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  RegisterRequest,
  RegistrationResponse,
  ScheduleResponse,
} from "../../schemas/registration-schemas.js";

export interface RegistrationsService {
  register(
    caller: Caller,
    universityId: string,
    classId: string,
    request: RegisterRequest,
  ): Promise<RegistrationResponse>;
  cancel(
    caller: Caller,
    universityId: string,
    classId: string,
    scoutId: string,
  ): Promise<void>;
  /** Stub in Phase 1; a real collection-group query lands in Phase 3. */
  listSchedule(caller: Caller, universityId: string): Promise<ScheduleResponse>;
}
