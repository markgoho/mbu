/**
 * Resolves the `returnTo` query parameter to a safe path of this app.
 *
 * It accepts only an absolute in-app path (`/foo`). It rejects a
 * protocol-relative URL (`//evil.com`) and all other values, to prevent an open
 * redirect. The result is the app home when the parameter is absent or unsafe.
 */
export function safeReturnTo(searchParameters: URLSearchParams): string {
  const value = searchParameters.get('returnTo');
  if (value?.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
}
