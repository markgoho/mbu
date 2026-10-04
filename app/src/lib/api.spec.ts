import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiFetch,
  apiFetchNoRedirect,
  apiFetchRaw,
  createJson,
  expectOk,
  getJson,
  sendJson,
} from '#lib/api.js';
import { IdempotencyKeys } from '#lib/idempotency.js';
import type { Fetcher } from '#lib/fetcher.js';

const { mockAuth, signOut, goto } = vi.hoisted(() => ({
  mockAuth: { currentUser: undefined as { uid: string } | undefined },
  signOut: vi.fn<(auth: unknown) => Promise<void>>(),
  goto: vi.fn<(url: string) => Promise<void>>(),
}));

vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => mockAuth }));
vi.mock('firebase/auth', () => ({ signOut }));
vi.mock('$app/navigation', () => ({ goto }));

interface SetupOptions {
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

function setup({ status = 200, body = {}, signOutError, gotoError }: SetupOptions = {}) {
  // Each test starts from a clean state, so no teardown is necessary.
  vi.unstubAllGlobals();
  vi.restoreAllMocks();

  mockAuth.currentUser = { uid: 'u1' };
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
  it('sends the session cookie of the browser and no Authorization header', async () => {
    const { fetchMock, sentHeaders } = setup();

    const response = await apiFetch('/api/users/me');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/users/me');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'same-origin' });
    expect(sentHeaders().has('Authorization')).toBe(false);
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
    expect(sentHeaders().has('Authorization')).toBe(false);
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
    setup({ status: 500, body: { code: 'INTERNAL', message: 'internal error' } });

    const response = await apiFetch('/api/users/me');

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ code: 'INTERNAL', message: 'internal error' });
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

describe('apiFetchRaw', () => {
  it('returns a 401 with no sign-out and no navigation', async () => {
    const { sentHeaders } = setup({ status: 401 });

    const response = await apiFetchRaw('/api/session');

    expect(response.status).toBe(401);
    expect(sentHeaders().has('Authorization')).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });
});

describe('apiFetchNoRedirect', () => {
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
    const body = { code: 'CLASS_FULL', message: 'Class is full' };

    const failure = expectOk(Response.json(body, { status: 409 }));

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 409, body, message: 'Class is full' });
  });

  it('keeps the details of the body', async () => {
    const body = {
      code: 'INVALID_ARGUMENT',
      message: 'Check the University form.',
      details: { 'location.city': 'Enter the city.' },
    };

    await expect(expectOk(Response.json(body, { status: 400 }))).rejects.toMatchObject({ body });
  });

  it('keeps a code that the app does not know', async () => {
    const body = { code: 'SOMETHING_NEW', message: 'A newer refusal' };

    await expect(expectOk(Response.json(body, { status: 409 }))).rejects.toMatchObject({ body });
  });

  it.each([
    ['the old error shape', { error: 'Class is full', code: 'class_full' }],
    ['a body with no message', { code: 'CONFLICT' }],
    ['a body with no code', { message: 'Conflict' }],
    ['details that are not text', { code: 'CONFLICT', message: 'Conflict', details: { c1: 1 } }],
    ['details that are a list', { code: 'CONFLICT', message: 'Conflict', details: ['c1'] }],
    ['a JSON value that is not an object', 'Conflict'],
  ])('throws an ApiError with no body for %s', async (_name, body) => {
    const failure = expectOk(Response.json(body, { status: 409 }));

    await expect(failure).rejects.toMatchObject({
      status: 409,
      body: undefined,
      message: 'API request failed with status 409',
    });
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
    const body = { code: 'NOT_FOUND', message: 'University not found' };
    const fetcher = fetcherReturning(404, body);

    await expect(getJson(fetcher, '/api/universities/u1')).rejects.toMatchObject({
      status: 404,
      body,
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
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.has('Idempotency-Key')).toBe(false);
  });

  it('sends the idempotency key as the Idempotency-Key header', async () => {
    const fetcher = fetcherReturning(201, { id: 'u1' });

    await sendJson(fetcher, 'POST', '/api/universities', {}, { idempotencyKey: 'key-1' });

    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('key-1');
  });

  it('throws an ApiError for a response that is not OK', async () => {
    const body = { code: 'INVALID_ARGUMENT', message: 'Title is required' };
    const fetcher = fetcherReturning(400, body);

    await expect(sendJson(fetcher, 'PATCH', '/api/universities/u1', {})).rejects.toMatchObject({
      status: 400,
      body,
    });
  });
});

describe('createJson', () => {
  it('POSTs the body with an Idempotency-Key and returns the parsed body of the response', async () => {
    const fetcher = fetcherReturning(201, { scoutId: 's1' });

    const created = await createJson(
      fetcher,
      '/api/users/me/scouts',
      { firstName: 'Alex' },
      new IdempotencyKeys(),
    );

    expect(created).toEqual({ scoutId: 's1' });
    const [path, init] = fetcher.mock.calls[0] ?? [];
    expect(path).toBe('/api/users/me/scouts');
    expect(init).toMatchObject({ method: 'POST', body: '{"firstName":"Alex"}' });
    expect(new Headers(init?.headers).get('Idempotency-Key')).toMatch(/^[\da-f-]{36}$/);
  });

  it('sends the same key again for a retry after a 5xx, and a new key after a 4xx', async () => {
    const keys = new IdempotencyKeys();
    const statuses = [503, 400, 201];
    const fetcher = vi.fn<Fetcher>(() =>
      Promise.resolve(
        Response.json({ code: 'X', message: 'x' }, { status: statuses.shift() ?? 201 }),
      ),
    );
    async function sendOnce() {
      try {
        await createJson(fetcher, '/api/universities', { id: 'u1' }, keys);
      } catch {
        // The test reads the sent keys, not the failure.
      }
    }

    await sendOnce();
    await sendOnce();
    await sendOnce();

    const sentKeys = fetcher.mock.calls.map(([, init]) =>
      new Headers(init?.headers).get('Idempotency-Key'),
    );
    expect(sentKeys[1]).toBe(sentKeys[0]);
    expect(sentKeys[2]).not.toBe(sentKeys[1]);
  });
});
