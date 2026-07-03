import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { ROLE_GRANTS_COLLECTION } from "../../../collections/role-grants.js";
import { USERS_COLLECTION, type UserDocument } from "../../../collections/users.js";
import { NotFoundError } from "../../../shared-api/errors/http-error.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  BootstrapResponse,
  OnboardingRequest,
  UserResponse,
} from "../../schemas/user-schemas.js";
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
  };
}

export class UsersServiceImpl implements UsersService {
  async bootstrap(caller: Caller): Promise<BootstrapResponse> {
    const database = getFirestore();
    const reference = database.collection(USERS_COLLECTION).doc(caller.uid);
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await this.claimPendingInvites(caller);

    const fresh = (await reference.get()).data() as UserDocument;
    return {
      user: toUserResponse(caller.uid, fresh),
      needsConsent:
        fresh.acceptedTermsAt === null || fresh.acceptedPrivacyAt === null,
    };
  }

  async getMe(caller: Caller): Promise<UserResponse> {
    const snapshot = await getFirestore()
      .collection(USERS_COLLECTION)
      .doc(caller.uid)
      .get();
    if (!snapshot.exists) {
      throw new NotFoundError("User not found");
    }
    return toUserResponse(caller.uid, snapshot.data() as UserDocument);
  }

  async onboard(
    caller: Caller,
    request: OnboardingRequest,
  ): Promise<UserResponse> {
    const reference = getFirestore()
      .collection(USERS_COLLECTION)
      .doc(caller.uid);
    if (!(await reference.get()).exists) {
      throw new NotFoundError("User not found; bootstrap the session first");
    }
    await reference.set(
      {
        displayName: request.displayName,
        acceptedTermsAt: FieldValue.serverTimestamp(),
        acceptedPrivacyAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
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
  private async claimPendingInvites(caller: Caller): Promise<void> {
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
}

export const usersService = new UsersServiceImpl();
