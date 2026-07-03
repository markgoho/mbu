/**
 * The authenticated caller, derived from a verified Firebase ID token by the
 * `requireAuth` resolver. Past that resolver, `emailVerified` is always true and
 * `email` is lowercased (the identity key used for invite claiming).
 */
export interface Caller {
  uid: string;
  email: string;
  emailVerified: boolean;
  superAdmin: boolean;
}
