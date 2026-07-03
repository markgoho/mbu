import { describe, expect, it } from "bun:test";
import { findBadge, MERIT_BADGES } from "../catalog/merit-badges.js";

describe("merit-badges catalog", () => {
  it("excludes discontinued badges", () => {
    expect(MERIT_BADGES.some(b => b.slug === "bugling")).toBe(true);
    expect(findBadge("camping")).toEqual({
      slug: "camping",
      title: "Camping",
      eagleRequired: true,
    });
  });

  it("returns undefined for unknown slugs", () => {
    expect(findBadge("not-a-badge")).toBeUndefined();
  });
});
