import type { DecodedIdToken } from "firebase-admin/auth";
import { describe, expect, it, mock } from "bun:test";
import { ForbiddenError, HttpError } from "../errors/http-error.js";
import { requireAuth, toVerifiedCaller } from "./require-auth.js";

function decoded(overrides: Record<string, unknown> = {}): DecodedIdToken {
  return {
    uid: "uid-1",
    email: "Parent@Example.com",
    email_verified: true,
    ...overrides,
  } as DecodedIdToken;
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected the function to throw");
}

describe("toVerifiedCaller", () => {
  it("lowercases email and defaults superAdmin to false", () => {
    expect(toVerifiedCaller(decoded())).toEqual({
      uid: "uid-1",
      email: "parent@example.com",
      emailVerified: true,
      superAdmin: false,
    });
  });

  it("surfaces the superAdmin custom claim", () => {
    const caller = toVerifiedCaller(decoded({ superAdmin: true }));
    expect(caller.superAdmin).toBe(true);
  });

  it("rejects an unverified email with EMAIL_NOT_VERIFIED (403)", () => {
    const error = catchError(() =>
      toVerifiedCaller(decoded({ email_verified: false })),
    );
    expect(error).toBeInstanceOf(ForbiddenError);
    expect((error as ForbiddenError).statusCode).toBe(403);
    expect((error as ForbiddenError).code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects a token with no email (401)", () => {
    const error = catchError(() => toVerifiedCaller(decoded({ email: undefined })));
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(401);
  });
});

describe("requireAuth resolver", () => {
  it("verifies the Authorization header and returns a caller", async () => {
    const verify = mock(async () => decoded());
    const resolve = requireAuth(verify);

    const result = await resolve({ headers: { authorization: "Bearer tok" } });

    expect(verify).toHaveBeenCalledWith("Bearer tok");
    expect(result.caller.uid).toBe("uid-1");
  });
});
