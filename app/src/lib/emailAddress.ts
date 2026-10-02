// The length limits of an address (254) and of its local part (64).
const LENGTH_LIMITS = /^(?=.{1,254}$)(?=.{1,64}@)/;

// The WHATWG pattern for a valid email address (the rule of `<input type="email">`).
const ADDRESS =
  /^[\w!#$%&'*+/=?^`{|}~-]+(?:\.[\w!#$%&'*+/=?^`{|}~-]+)*@[a-zA-Z\d](?:[a-zA-Z\d-]{0,61}[a-zA-Z\d])?(?:\.[a-zA-Z\d](?:[a-zA-Z\d-]{0,61}[a-zA-Z\d])?)*$/;

/**
 * Tells if a value is an email address. This is the rule that the email
 * validator of the Angular app had, so that the forms accept the same values.
 * An empty value is not an address.
 */
export function isEmailAddress(value: string): boolean {
  return LENGTH_LIMITS.test(value) && ADDRESS.test(value);
}
