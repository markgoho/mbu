import { describe, expect, it } from "bun:test";
import type { UniversityStatus } from "../../collections/universities.js";
import { ConflictError } from "../../shared-api/errors/http-error.js";
import { assertTransition } from "./transitions.js";

const ALL_STATUSES: UniversityStatus[] = [
  "draft",
  "submitted",
  "needs_review",
  "published",
  "closed",
  "rejected",
];

const LEGAL_EDGES: [UniversityStatus, UniversityStatus][] = [
  ["draft", "submitted"],
  ["rejected", "submitted"],
  ["submitted", "published"],
  ["submitted", "rejected"],
  ["published", "closed"],
];

describe("assertTransition", () => {
  for (const [from, to] of LEGAL_EDGES) {
    it(`allows ${from} -> ${to}`, () => {
      expect(() => assertTransition(from, to)).not.toThrow();
    });
  }

  const legalSet = new Set(LEGAL_EDGES.map(([from, to]) => `${from}->${to}`));
  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      if (legalSet.has(`${from}->${to}`)) continue;
      it(`rejects ${from} -> ${to}`, () => {
        expect(() => assertTransition(from, to)).toThrow(ConflictError);
      });
    }
  }
});
