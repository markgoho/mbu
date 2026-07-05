import type { BadgeCatalogResponse } from "../schemas/class-schemas.js";
import type { ClassesService } from "../services/classes/interface.js";

export function listBadgesLogic({
  classesService,
}: {
  classesService: ClassesService;
}): Promise<BadgeCatalogResponse> {
  return classesService.listBadges();
}
