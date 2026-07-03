import { beforeEach, describe, expect, it, mock } from "bun:test";
import { AuthError } from "../../errors/http-error.js";

const verifyIdToken = mock();

mock.module("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken }),
}));
mock.module("firebase-functions/v2", () => ({
  logger: { warn: mock(), error: mock(), info: mock() },
}));

const { verifyAuthToken } = await import("./verify-token.js");

describe("verifyAuthToken", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("rejects a missing Authorization header", async () => {
    await expect(verifyAuthToken(undefined)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects a non-Bearer scheme", async () => {
    await expect(verifyAuthToken("Basic abc")).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("rejects an empty Bearer token", async () => {
    await expect(verifyAuthToken("Bearer   ")).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("returns the decoded token for a valid Bearer token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u1", email: "a@b.com" });
    const decoded = await verifyAuthToken("Bearer good-token");
    expect(decoded.uid).toBe("u1");
    expect(decoded.email).toBe("a@b.com");
    expect(verifyIdToken).toHaveBeenCalledWith("good-token");
  });

  it("maps an expired token to a friendly AuthError", async () => {
    verifyIdToken.mockRejectedValue({
      code: "auth/id-token-expired",
      message: "expired",
    });
    await expect(verifyAuthToken("Bearer t")).rejects.toThrow(/expired/i);
  });

  it("maps an unknown Firebase error to a generic AuthError", async () => {
    verifyIdToken.mockRejectedValue({ code: "auth/weird", message: "x" });
    await expect(verifyAuthToken("Bearer t")).rejects.toBeInstanceOf(AuthError);
  });
});
