import { describe, expect, it, vi } from 'vitest';
import type { SessionResponse } from '#lib/api-types/session-api.types.js';
import { ApiError } from '#lib/api.js';
import { resolveAuth } from '#lib/auth.js';
import type { Fetcher } from '#lib/fetcher.js';

interface MockUser {
  email: string | null;
  emailVerified: boolean;
  getIdToken: () => Promise<string>;
}

const { mockAuth, signOut } = vi.hoisted(() => ({
  mockAuth: {
    currentUser: undefined as MockUser | undefined,
    authStateReady: () => Promise.resolve(),
  },
  signOut: vi.fn<(auth: unknown) => Promise<void>>(),
}));

vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => mockAuth }));
vi.mock('firebase/auth', () => ({ signOut }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const session: SessionResponse = {
  uid: 'u1',
  email: 'pat@example.com',
  displayName: 'Pat Parent',
  superAdmin: false,
};

interface Answer {
  status: number;
  body?: unknown;
}

interface SetupOptions {
  /**
  The answer of `GET /api/session`. The default is no session (401).
  */
  probe?: Answer;
  /**
  The answer of `POST /api/session`. The default is a new session.
  */
  exchange?: Answer;
  /**
  The user that Firebase restores. `undefined` means none.
  */
  restoredUser?: Omit<MockUser, 'getIdToken'>;
  /**
  The error that the Firebase sign-out rejects with.
  */
  signOutError?: Error;
}

function setup({
  probe = { status: 401, body: { code: 'UNAUTHORIZED', message: 'Missing session cookie' } },
  exchange = { status: 200, body: session },
  restoredUser,
  signOutError,
}: SetupOptions = {}) {
  // Firebase restores its user asynchronously: until `authStateReady()`
  // resolves, `currentUser` is empty, as it is after a hard refresh.
  mockAuth.currentUser = undefined;
  mockAuth.authStateReady = () => {
    mockAuth.currentUser = restoredUser && {
      ...restoredUser,
      getIdToken: () => Promise.resolve('id-token'),
    };
    return Promise.resolve();
  };
  signOut.mockReset();
  signOut.mockImplementation(() =>
    signOutError ? Promise.reject(signOutError) : Promise.resolve(),
  );
  vi.spyOn(console, 'error').mockReturnValue();

  const fetcher = vi.fn<Fetcher>((_path, init) => {
    const answer = init?.method === 'POST' ? exchange : probe;
    return Promise.resolve(Response.json(answer.body ?? {}, { status: answer.status }));
  });
  const exchangeBody = () => {
    const call = fetcher.mock.calls.find(([, init]) => init?.method === 'POST');
    return call ? (JSON.parse(String(call[1]?.body)) as unknown) : undefined;
  };
  return { fetcher, exchangeBody };
}

const verifiedUser = { email: 'pat@example.com', emailVerified: true };

describe('resolveAuth', () => {
  it('is signed in with the session of the cookie, and exchanges nothing', async () => {
    const { fetcher, exchangeBody } = setup({
      probe: { status: 200, body: session },
      restoredUser: verifiedUser,
    });

    await expect(resolveAuth(fetcher)).resolves.toEqual({ status: 'signed-in', session });
    expect(exchangeBody()).toBeUndefined();
  });

  it('is signed out with no session and no Firebase user', async () => {
    const { fetcher } = setup();

    await expect(resolveAuth(fetcher)).resolves.toEqual({ status: 'signed-out' });
  });

  it('exchanges the ID token of a verified user in the body, then signs the SDK out', async () => {
    const { fetcher, exchangeBody } = setup({ restoredUser: verifiedUser });

    await expect(resolveAuth(fetcher)).resolves.toEqual({ status: 'signed-in', session });
    expect(exchangeBody()).toEqual({ idToken: 'id-token' });
    expect(signOut).toHaveBeenCalledExactlyOnceWith(mockAuth);
  });

  it('keeps the session when the SDK sign-out after the exchange fails', async () => {
    const { fetcher } = setup({ restoredUser: verifiedUser, signOutError: new Error('offline') });

    await expect(resolveAuth(fetcher)).resolves.toEqual({ status: 'signed-in', session });
  });

  it('keeps the Firebase user of an unverified email, with no exchange', async () => {
    const { fetcher, exchangeBody } = setup({
      restoredUser: { email: 'new@example.com', emailVerified: false },
    });

    await expect(resolveAuth(fetcher)).resolves.toEqual({
      status: 'unverified',
      email: 'new@example.com',
    });
    expect(exchangeBody()).toBeUndefined();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('is unverified when the API refuses the email, and keeps the Firebase user', async () => {
    const { fetcher } = setup({
      restoredUser: { email: null, emailVerified: true },
      exchange: {
        status: 403,
        body: { code: 'EMAIL_NOT_VERIFIED', message: 'Email address is not verified' },
      },
    });

    await expect(resolveAuth(fetcher)).resolves.toEqual({ status: 'unverified', email: '' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs the SDK out when the API refuses the token', async () => {
    const { fetcher } = setup({
      restoredUser: verifiedUser,
      exchange: { status: 401, body: { code: 'UNAUTHORIZED', message: 'Invalid auth token' } },
    });

    await expect(resolveAuth(fetcher)).resolves.toEqual({ status: 'signed-out' });
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('throws an ApiError when the API fails', async () => {
    const { fetcher } = setup({
      probe: { status: 503, body: { code: 'INTERNAL', message: 'internal error' } },
    });

    await expect(resolveAuth(fetcher)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws an ApiError when the exchange fails', async () => {
    const { fetcher } = setup({
      restoredUser: verifiedUser,
      exchange: { status: 429, body: { code: 'RATE_LIMITED', message: 'too many requests' } },
    });

    await expect(resolveAuth(fetcher)).rejects.toMatchObject({ status: 429 });
    expect(signOut).not.toHaveBeenCalled();
  });
});
