import { describe, expect, it } from "bun:test";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { UserDocument } from "../../../collections/users.js";
import { POLICY_VERSION } from "../../../constants/privacy.js";
import { NotFoundError } from "../../../shared-api/errors/http-error.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import { UsersServiceImpl } from "./index.js";

const caller: Caller = {
  uid: "u1",
  email: "u1@example.com",
  emailVerified: true,
  superAdmin: false,
};

function mockFirestore(initial: UserDocument | null) {
  let stored = initial;
  const ref = {
    get: () => Promise.resolve({ exists: stored !== null, data: () => stored }),
    set: (data: Partial<UserDocument>, options?: { merge?: boolean }) => {
      stored = (
        options?.merge ? { ...(stored as UserDocument), ...data } : data
      ) as UserDocument;
      return Promise.resolve();
    },
  };
  const db = {
    collection(path: string) {
      if (path === "users") return { doc: () => ref };
      throw new Error(`unexpected collection: ${path}`);
    },
  } as unknown as Firestore;
  return { db, getStored: () => stored };
}

const bootstrapped: UserDocument = {
  displayName: "",
  email: caller.email,
  phone: null,
  counselorProfile: null,
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  acceptedPolicyVersion: null,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

describe("UsersServiceImpl.onboard", () => {
  it("stamps acceptedPolicyVersion alongside the terms/privacy timestamps", async () => {
    const { db, getStored } = mockFirestore(bootstrapped);
    const service = new UsersServiceImpl(db);

    const result = await service.onboard(caller, {
      displayName: "Pat Parent",
      acceptedTerms: true,
    });

    expect(result.displayName).toBe("Pat Parent");
    expect(getStored()?.acceptedPolicyVersion).toBe(POLICY_VERSION);
  });

  it("throws NotFoundError when the user hasn't bootstrapped", async () => {
    const { db } = mockFirestore(null);
    const service = new UsersServiceImpl(db);

    await expect(
      service.onboard(caller, { displayName: "Pat", acceptedTerms: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
