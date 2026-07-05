import { describe, expect, it, mock } from "bun:test";
import { ForbiddenError } from "../../errors/http-error.js";
import type { Caller } from "../../types/caller.js";
import {
  assertChancellorOf,
  assertCounselorOf,
  assertOwnsScout,
  requireSuperAdmin,
} from "./assertions.js";
import type { GrantQuery, RoleGrantsReader } from "./role-grants-reader.js";
import type { ScoutOwnershipReader } from "./scout-ownership-reader.js";

function caller(overrides: Partial<Caller> = {}): Caller {
  return {
    uid: "u1",
    email: "u1@example.com",
    emailVerified: true,
    superAdmin: false,
    ...overrides,
  };
}

function readerAllowing(
  grants: ReadonlyArray<{ scopeId: string; role: string }>,
): RoleGrantsReader {
  return {
    hasActiveGrant: ({ scopeId, role }: GrantQuery) =>
      Promise.resolve(
        grants.some(g => g.scopeId === scopeId && g.role === role),
      ),
    listActiveClassGrants: () => Promise.resolve([]),
  };
}

describe("assertChancellorOf", () => {
  it("allows an active chancellor grant", async () => {
    await assertChancellorOf(
      caller(),
      "uni1",
      readerAllowing([{ scopeId: "uni1", role: "chancellor" }]),
    );
  });

  it("rejects when there is no grant", async () => {
    await expect(
      assertChancellorOf(caller(), "uni1", readerAllowing([])),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows super-admin without consulting grants", async () => {
    const reader = {
      hasActiveGrant: mock(() => Promise.resolve(false)),
      listActiveClassGrants: () => Promise.resolve([]),
    };
    await assertChancellorOf(caller({ superAdmin: true }), "uni1", reader);
    expect(reader.hasActiveGrant).not.toHaveBeenCalled();
  });
});

describe("assertCounselorOf", () => {
  const scope = { universityId: "uni1", classId: "cls1" };

  it("allows an active counselor grant on the class", async () => {
    await assertCounselorOf(
      caller(),
      scope,
      readerAllowing([{ scopeId: "cls1", role: "counselor" }]),
    );
  });

  it("allows a chancellor of the owning university (chancellor supersedes)", async () => {
    await assertCounselorOf(
      caller(),
      scope,
      readerAllowing([{ scopeId: "uni1", role: "chancellor" }]),
    );
  });

  it("rejects when neither grant exists", async () => {
    await expect(
      assertCounselorOf(caller(), scope, readerAllowing([])),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a counselor of a different class in the same university", async () => {
    await expect(
      assertCounselorOf(
        caller(),
        scope,
        readerAllowing([{ scopeId: "cls2-not-cls1", role: "counselor" }]),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows super-admin", async () => {
    await assertCounselorOf(
      caller({ superAdmin: true }),
      scope,
      readerAllowing([]),
    );
  });
});

describe("assertOwnsScout", () => {
  const readerFor = (owns: boolean): ScoutOwnershipReader => ({
    exists: () => Promise.resolve(owns),
  });

  it("allows the owning parent", async () => {
    await assertOwnsScout(caller(), "scout1", readerFor(true));
  });

  it("rejects a non-owner (no super-admin bypass)", async () => {
    await expect(
      assertOwnsScout(caller({ superAdmin: true }), "scout1", readerFor(false)),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("requireSuperAdmin", () => {
  it("allows a super-admin", () => {
    requireSuperAdmin(caller({ superAdmin: true }));
  });

  it("rejects a non-super-admin", () => {
    expect(() => requireSuperAdmin(caller())).toThrow(ForbiddenError);
  });
});
