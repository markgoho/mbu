/**
 * `bun run generate:badge-catalog`: writes the Go API's badge catalog,
 * `api/internal/catalog/badges.json`, from the one canonical list in
 * `scripts/merit-badges.ts` (#248, #100). Do not edit the JSON by hand.
 *
 * The API needs only `slug`, `title` and `eagleRequired`. Discontinued
 * badges are left out: a chancellor cannot offer a class for one. The order
 * is the order of `scripts/merit-badges.ts`.
 *
 * `bun run check:badge-catalog` runs this script and fails when the
 * committed JSON is not what it writes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { MERIT_BADGES } from "./merit-badges.ts";

const OUTPUT = join(
  import.meta.dir,
  "..",
  "api",
  "internal",
  "catalog",
  "badges.json",
);

const catalog = MERIT_BADGES.filter(badge => !badge.discontinued).map(
  badge => ({
    slug: badge.slug,
    title: badge.title,
    eagleRequired: badge.eagle_required,
  }),
);

writeFileSync(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.length} badges to ${OUTPUT}`);
