// A base for the parse of a path. No domain below the `.invalid` TLD can exist
// (RFC 2606), so no `returnTo` value can have this origin by itself.
const PARSE_BASE = 'https://return-to.invalid';

/**
 * Tells if a value is a path that stays on the origin of the app. The start of
 * the value is not sufficient for this: a browser reads a backslash as a slash
 * and removes a tab or a newline, so `/\evil.com` is the URL of a different
 * site. The parse of the value gives the origin that the browser would use.
 */
function isInAppPath(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  try {
    return new URL(value, PARSE_BASE).origin === PARSE_BASE;
  } catch {
    return false;
  }
}

/**
 * Resolves the `returnTo` query parameter to a safe path of this app.
 *
 * It accepts only an absolute in-app path (`/foo`). It rejects a
 * protocol-relative URL (`//evil.com`), a value that a browser reads as one,
 * and all other values, to prevent an open redirect. The result is the app
 * home when the parameter is absent or unsafe.
 */
export function safeReturnTo(searchParameters: URLSearchParams): string {
  const value = searchParameters.get('returnTo');
  return value && isInAppPath(value) ? value : '/';
}
