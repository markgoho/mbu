/**
 * A minimal fetch-shaped function. Each domain module in `src/lib/` takes one
 * as a parameter and does not import a transport itself. A route passes
 * `apiFetch` or `apiFetchNoRedirect` from `#lib/api.js`.
 */
export type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;
