import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, apiFetchNoRedirect, expectOk, getJson, sendJson } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';

interface MockUser {
  getIdToken: () => Promise<string>;
}

const { mockAuth, signOut, goto } = vi.hoisted(() => ({
  mockAuth: { currentUser: undefined as MockUser | undefined },
  signOut: vi.fn<(auth: unknown) => Promise<void>>(),
  goto: vi.fn<(url: string) => Promise<void>>(),
}));

vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => mockAuth }));
vi.mock('firebase/auth', () => ({ signOut }));
vi.mock('$app/navigation', () => ({ goto }));

interface SetupOptions {
  /**
  `false` means that no user is signed in.
  */
  isSignedIn?: boolean;
  /**
  The token call of the signed-in user.
  */
  getIdToken?: MockUser['getIdToken'];
  /**
  The status of the response from the server.
  */
  status?: number;
  /**
  The JSON body of the response from the server.
  */
  body?: unknown;
  /**
  The error that the sign-out rejects with. The default is a sign-out that succeeds.
  */
  signOutError?: Error;
  /**
  The error that the navigation rejects with. The default is a navigation that succeeds.
  */
  gotoError?: Error;
}

function setup({
  isSignedIn = true,
  getIdToken = () => Promise.resolve('test-token'),
  status = 200,
  body = {},
  signOutError,
  gotoError,
}: SetupOptions = {}) {
  // Each test starts from a clean state, so no teardown is necessary.
  vi.unstubAllGlobals();
  vi.restoreAllMocks();

  mockAuth.currentUser = isSignedIn ? { getIdToken } : undefined;
  signOut.mockReset();
  signOut.mockImplementation(() =>
    signOutError ? Promise.reject(signOutError) : Promise.resolve(),
  );
  goto.mockReset();
  goto.mockImplementation(() => (gotoError ? Promise.reject(gotoError) : Promise.resolve()));
  const consoleError = vi.spyOn(console, 'error').mockReturnValue();

  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status })));
  vi.stubGlobal('fetch', fetchMock);

  /**
  The headers of the request that reached the server.
  */
  function sentHeaders(): Headers {
    return new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
  }

  return { fetchMock, sentHeaders, consoleError };
}

describe('apiFetch', () => {
  it('attaches the ID token of the signed-in user as a Bearer credential', async () => {
    const { fetchMock, sentHeaders } = setup();

    const response = await apiFetch('/api/users/me');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/users/me');
    expect(sentHeaders().get('Authorization')).toBe('Bearer test-token');
    expect(response.status).toBe(200);
  });

  it('keeps the method, the body and the headers of the caller', async () => {
    const { fetchMock, sentHeaders } = setup();

    await apiFetch('/api/users/me', {
      method: 'PATCH',
      body: '{"displayName":"Pat"}',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: '{"displayName":"Pat"}',
    });
    expect(sentHeaders().get('Content-Type')).toBe('application/json');
    expect(sentHeaders().get('Authorization')).toBe('Bearer test-token');
  });

  it('sends the request without a credential when no user is signed in', async () => {
    const { fetchMock, sentHeaders } = setup({ isSignedIn: false });

    await apiFetch('/api/health');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentHeaders().has('Authorization')).toBe(false);
  });

  it('does not attach the credential to a path that is not an API path', async () => {
    const { fetchMock, sentHeaders } = setup();

    await apiFetch('https://example.com/api/users/me');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentHeaders().has('Authorization')).toBe(false);
  });

  it('logs the error and sends the request without a credential when the token call fails', async () => {
    const tokenError = new Error('network-request-failed');
    const { fetchMock, sentHeaders, consoleError } = setup({
      getIdToken: () => Promise.reject(tokenError),
    });

    await apiFetch('/api/users/me');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentHeaders().has('Authorization')).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to acquire auth token for request:',
      expect.objectContaining({ path: '/api/users/me', error: tokenError }),
    );
  });

  it('signs the user out and then goes to the sign-in page on a 401 response', async () => {
    setup({ status: 401 });

    const response = await apiFetch('/api/users/me');

    expect(signOut).toHaveBeenCalledWith(mockAuth);
    expect(goto).toHaveBeenCalledWith('/sign-in');
    expect(signOut).toHaveBeenCalledBefore(goto);
    expect(response.status).toBe(401);
  });

  it('logs the error and goes to the sign-in page when the sign-out after a 401 fails', async () => {
    const signOutError = new Error('sign-out failed');
    const { consoleError } = setup({ status: 401, signOutError });

    await apiFetch('/api/users/me');

    expect(consoleError).toHaveBeenCalledWith('Sign out after 401 failed:', signOutError);
    expect(goto).toHaveBeenCalledWith('/sign-in');
  });

  it('logs the error and returns the 401 response when the navigation fails', async () => {
    const navigationError = new Error('navigation aborted');
    const { consoleError } = setup({ status: 401, gotoError: navigationError });

    const response = await apiFetch('/api/users/me');

    expect(response.status).toBe(401);
    expect(consoleError).toHaveBeenCalledWith(
      'Redirect to sign-in after 401 failed:',
      navigationError,
    );
  });

  it('returns a response that is not OK and not a 401, with no sign-out and no navigation', async () => {
    setup({ status: 500, body: { error: 'Internal server error' } });

    const response = await apiFetch('/api/users/me');

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
    expect(signOut).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it('signs out and navigates one time when two requests get a 401 at the same time', async () => {
    setup({ status: 401 });

    const responses = await Promise.all([
      apiFetch('/api/users/me'),
      apiFetch('/api/universities/mine'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401]);
    expect(signOut).toHaveBeenCalledOnce();
    expect(goto).toHaveBeenCalledOnce();
  });

  it('handles a 401 again after an earlier redirect is complete', async () => {
    setup({ status: 401 });

    await apiFetch('/api/users/me');
    await apiFetch('/api/users/me');

    expect(goto).toHaveBeenCalledTimes(2);
  });
});

describe('apiFetchNoRedirect', () => {
  it('attaches the ID token of the signed-in user as a Bearer credential', async () => {
    const { sentHeaders } = setup();

    await apiFetchNoRedirect('/api/users/me');

    expect(sentHeaders().get('Authorization')).toBe('Bearer test-token');
  });

  it('signs the user out on a 401 response and returns the response with no navigation', async () => {
    setup({ status: 401 });

    const response = await apiFetchNoRedirect('/api/users/me');

    expect(response.status).toBe(401);
    expect(signOut).toHaveBeenCalledWith(mockAuth);
    expect(goto).not.toHaveBeenCalled();
  });

  it('logs the error and returns the 401 response when the sign-out fails', async () => {
    const signOutError = new Error('sign-out failed');
    const { consoleError } = setup({ status: 401, signOutError });

    const response = await apiFetchNoRedirect('/api/users/me');

    expect(response.status).toBe(401);
    expect(consoleError).toHaveBeenCalledWith('Sign out after 401 failed:', signOutError);
  });
});

/**
 * A `Fetcher` that answers each request with a JSON response.
 */
function fetcherReturning(status: number, body: unknown) {
  return vi.fn<Fetcher>(() => Promise.resolve(Response.json(body, { status })));
}

describe('expectOk', () => {
  it('returns an OK response as it is', async () => {
    const response = new Response(undefined, { status: 204 });

    await expect(expectOk(response)).resolves.toBe(response);
  });

  it('throws an ApiError that holds the status and the parsed body of a response that is not OK', async () => {
    const body = { error: 'Class is full', code: 'class_full' };

    const failure = expectOk(Response.json(body, { status: 409 }));

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 409, body });
  });

  it('throws an ApiError with no body when the body of the response is not JSON', async () => {
    const failure = expectOk(new Response('<html>Bad Gateway</html>', { status: 502 }));

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 502, body: undefined });
  });
});

describe('getJson', () => {
  it('returns the parsed body of an OK response', async () => {
    const fetcher = fetcherReturning(200, { status: 'ok' });

    await expect(getJson(fetcher, '/api/health')).resolves.toEqual({ status: 'ok' });
    expect(fetcher).toHaveBeenCalledWith('/api/health');
  });

  it('throws an ApiError for a response that is not OK', async () => {
    const fetcher = fetcherReturning(404, { error: 'University not found' });

    await expect(getJson(fetcher, '/api/universities/u1')).rejects.toMatchObject({
      status: 404,
      body: { error: 'University not found' },
    });
  });
});

describe('sendJson', () => {
  it('sends the body as JSON with the method and returns the parsed body of the response', async () => {
    const fetcher = fetcherReturning(200, { id: 'u1' });

    const created = await sendJson(fetcher, 'POST', '/api/universities', { title: 'Fall MBU' });

    expect(created).toEqual({ id: 'u1' });
    const [path, init] = fetcher.mock.calls[0] ?? [];
    expect(path).toBe('/api/universities');
    expect(init).toMatchObject({ method: 'POST', body: '{"title":"Fall MBU"}' });
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('throws an ApiError for a response that is not OK', async () => {
    const fetcher = fetcherReturning(400, { error: 'Title is required' });

    await expect(sendJson(fetcher, 'PATCH', '/api/universities/u1', {})).rejects.toMatchObject({
      status: 400,
      body: { error: 'Title is required' },
    });
  });
});
