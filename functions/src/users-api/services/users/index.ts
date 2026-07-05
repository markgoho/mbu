import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  ROLE_GRANTS_COLLECTION,
  type RoleGrantDocument,
} from "../../../collections/role-grants.js";
import { scoutsPath } from "../../../collections/scouts.js";
import {
  UNIVERSITIES_COLLECTION,
  type UniversityDocument,
} from "../../../collections/universities.js";
import {
  USERS_COLLECTION,
  type UserDocument,
} from "../../../collections/users.js";
import { POLICY_VERSION } from "../../../constants/privacy.js";
import {
  ERROR_CODES,
  ForbiddenError,
  NotFoundError,
} from "../../../shared-api/errors/http-error.js";
import { authAdminPort } from "../../../shared-api/services/auth/auth-admin-port.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  BootstrapResponse,
  OnboardingRequest,
  UserResponse,
} from "../../schemas/user-schemas.js";
import { scoutsService } from "../scouts/index.js";
import type { UsersService } from "./interface.js";

function toIso(value: Timestamp | null): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function toUserResponse(uid: string, doc: UserDocument): UserResponse {
  return {
    uid,
    displayName: doc.displayName,
    email: doc.email,
    phone: doc.phone,
    acceptedTermsAt: toIso(doc.acceptedTermsAt),
    acceptedPrivacyAt: toIso(doc.acceptedPrivacyAt),
    acceptedPolicyVersion: doc.acceptedPolicyVersion ?? null,
    rosterExportAckAt: toIso(doc.rosterExportAckAt),
  };
}

async function bootstrap(caller: Caller): Promise<BootstrapResponse> {
  const reference = getFirestore().collection(USERS_COLLECTION).doc(caller.uid);
  const existing = await reference.get();

  if (existing.exists) {
    // Keep the mirrored email in sync with Auth (authoritative).
    await reference.set(
      { email: caller.email, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } else {
    // displayName is set during onboarding; start blank rather than guessing.
    await reference.set({
      displayName: "",
      email: caller.email,
      phone: null,
      counselorProfile: null,
      acceptedTermsAt: null,
      acceptedPrivacyAt: null,
      acceptedPolicyVersion: null,
      rosterExportAckAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await claimPendingInvites(caller);

  const fresh = (await reference.get()).data() as UserDocument;
  return {
    user: toUserResponse(caller.uid, fresh),
    needsConsent:
      fresh.acceptedTermsAt === null || fresh.acceptedPrivacyAt === null,
  };
}

async function getMe(caller: Caller): Promise<UserResponse> {
  const snapshot = await getFirestore()
    .collection(USERS_COLLECTION)
    .doc(caller.uid)
    .get();
  if (!snapshot.exists) {
    throw new NotFoundError("User not found");
  }
  return toUserResponse(caller.uid, snapshot.data() as UserDocument);
}

async function onboard(
  caller: Caller,
  request: OnboardingRequest,
): Promise<UserResponse> {
  const reference = getFirestore().collection(USERS_COLLECTION).doc(caller.uid);
  if (!(await reference.get()).exists) {
    throw new NotFoundError("User not found; bootstrap the session first");
  }
  await reference.set(
    {
      displayName: request.displayName,
      acceptedTermsAt: FieldValue.serverTimestamp(),
      acceptedPrivacyAt: FieldValue.serverTimestamp(),
      acceptedPolicyVersion: POLICY_VERSION,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return toUserResponse(
    caller.uid,
    (await reference.get()).data() as UserDocument,
  );
}

async function deleteAccount(caller: Caller): Promise<void> {
  const database = getFirestore();
  const chancellorGrants = await database
    .collection(ROLE_GRANTS_COLLECTION)
    .where("uid", "==", caller.uid)
    .where("role", "==", "chancellor")
    .where("status", "==", "active")
    .get();

  for (const grant of chancellorGrants.docs) {
    const { scopeId } = grant.data() as RoleGrantDocument;
    const universitySnapshot = await database
      .collection(UNIVERSITIES_COLLECTION)
      .doc(scopeId)
      .get();
    const university = universitySnapshot.exists
      ? (universitySnapshot.data() as UniversityDocument)
      : null;
    if (
      university &&
      university.status !== "draft" &&
      university.status !== "closed"
    ) {
      throw new ForbiddenError(
        "Close your events first",
        ERROR_CODES.CLOSE_EVENTS_FIRST,
      );
    }
  }

  const scoutsSnapshot = await database
    .collection(scoutsPath(caller.uid))
    .get();
  for (const scoutDoc of scoutsSnapshot.docs) {
    await scoutsService.remove(caller, scoutDoc.id);
  }

  // Revoke every remaining active grant — counselor grants and the
  // chancellor grants on draft/closed events allowed past the block above —
  // so no active grant is left pointing at the deleted account.
  const activeGrants = await database
    .collection(ROLE_GRANTS_COLLECTION)
    .where("uid", "==", caller.uid)
    .where("status", "==", "active")
    .get();
  if (!activeGrants.empty) {
    const batch = database.batch();
    for (const grant of activeGrants.docs) {
      batch.update(grant.ref, {
        status: "revoked",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // Delete the PII-bearing user doc before the Auth user: this cascade is
  // retry-tolerant rather than atomic, and removing the PII first means a
  // failure here leaves only a login with no data behind it (a re-login
  // re-bootstraps a blank doc), never orphaned PII.
  await database.collection(USERS_COLLECTION).doc(caller.uid).delete();
  await authAdminPort.deleteUser(caller.uid);
}

async function ackRosterExport(caller: Caller): Promise<UserResponse> {
  const reference = getFirestore().collection(USERS_COLLECTION).doc(caller.uid);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    throw new NotFoundError("User not found");
  }
  const existing = snapshot.data() as UserDocument;
  if (existing.rosterExportAckAt === null) {
    await reference.set(
      {
        rosterExportAckAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  return toUserResponse(
    caller.uid,
    (await reference.get()).data() as UserDocument,
  );
}

/**
 * Bind any email-keyed counselor/chancellor invites to this uid and activate
 * them. Uses the (invitedEmail, status) index; caller.email is lowercased to
 * match the stored invitedEmail.
 */
async function claimPendingInvites(caller: Caller): Promise<void> {
  const database = getFirestore();
  const pending = await database
    .collection(ROLE_GRANTS_COLLECTION)
    .where("invitedEmail", "==", caller.email)
    .where("status", "==", "invited")
    .get();
  if (pending.empty) return;

  const batch = database.batch();
  for (const grant of pending.docs) {
    batch.update(grant.ref, {
      uid: caller.uid,
      status: "active",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
}

export const usersService: UsersService = {
  bootstrap,
  getMe,
  onboard,
  deleteAccount,
  ackRosterExport,
};
