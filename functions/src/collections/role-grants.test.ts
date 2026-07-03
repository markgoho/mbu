import { describe, expect, it } from "bun:test";
import { roleGrantId } from "./role-grants.js";

describe("roleGrantId", () => {
  it("composes `{scopeId}:{role}:{uidOrEmail}`", () => {
    expect(roleGrantId("uni_A", "chancellor", "jane")).toBe(
      "uni_A:chancellor:jane",
    );
  });

  it("is idempotent — same inputs always yield the same id (dedup by construction)", () => {
    const a = roleGrantId("cls_9", "counselor", "sam@example.com");
    const b = roleGrantId("cls_9", "counselor", "sam@example.com");
    expect(a).toBe(b);
  });

  it("distinguishes role, scope, and grantee", () => {
    const ids = new Set([
      roleGrantId("uni_A", "chancellor", "jane"),
      roleGrantId("uni_A", "counselor", "jane"), // different role
      roleGrantId("uni_B", "chancellor", "jane"), // different scope
      roleGrantId("uni_A", "chancellor", "bob"), // different grantee
    ]);
    expect(ids.size).toBe(4);
  });

  it("accepts an invited email as the grantee before a uid exists", () => {
    expect(roleGrantId("cls_2", "counselor", "invitee@example.com")).toBe(
      "cls_2:counselor:invitee@example.com",
    );
  });
});
