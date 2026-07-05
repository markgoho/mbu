import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  type HttpEvent,
  type HttpRequest,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { Component, InjectionToken, inject, signal } from '@angular/core';
import { RouterOutlet, provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular/zoneless';
import { Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';

interface MockUser {
  uid: string;
  getIdToken: () => Promise<string>;
}

// The Angular unit-test system disallows vi.mock on relative imports, so we
// mock at the firebase SDK boundary instead: getAuth returns our controllable
// auth object, which lib/firebase then exports as the shared `auth` singleton.
const { mockAuth, mockSignOut } = vi.hoisted(() => ({
  mockAuth: { currentUser: undefined as MockUser | null | undefined },
  mockSignOut: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  connectAuthEmulator: vi.fn(),
  signOut: mockSignOut,
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
}));

/** The route the interceptor redirects to on a 401. */
@Component({ template: '<p>Sign-in page</p>' })
class SignInStub {}

/** The URL the host component requests — configured per test. */
const REQUEST_URL = new InjectionToken<string>('REQUEST_URL');

/**
 * A tiny consumer of `HttpClient`. Clicking "Fetch" fires the request the
 * interceptor wraps; the result the caller observes is reflected in the DOM.
 */
@Component({
  imports: [RouterOutlet],
  template: `
    <button (click)="fetch()">Fetch</button>
    <p>Result: {{ result() }}</p>
    <router-outlet />
  `,
})
class HostComponent {
  private readonly http = inject(HttpClient);
  private readonly url = inject(REQUEST_URL);
  readonly result = signal('idle');

  fetch(): void {
    this.http.get(this.url).subscribe({
      next: () => this.result.set('ok'),
      error: () => this.result.set('error'),
    });
  }
}

/**
 * Stands in for the real transport backend (the seam the interceptor chain
 * terminates at). Records the outgoing requests it receives so tests can assert
 * on what the interceptor produced, and emits a configurable response.
 */
class FakeBackend implements HttpBackend {
  readonly requests: HttpRequest<unknown>[] = [];

  constructor(private readonly status: number) {}

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    this.requests.push(request);
    return new Observable<HttpEvent<unknown>>((subscriber) => {
      if (this.status >= 400) {
        subscriber.error(
          new HttpErrorResponse({
            status: this.status,
            statusText: 'Error',
            url: request.url,
          }),
        );
      } else {
        subscriber.next(new HttpResponse({ status: this.status, body: {} }));
        subscriber.complete();
      }
    });
  }
}

describe('authInterceptor', () => {
  interface SetupOptions {
    currentUser?: MockUser | null;
    url?: string;
    responseStatus?: number;
  }

  async function setup({
    currentUser,
    url = '/api/users/me',
    responseStatus = 200,
  }: SetupOptions = {}) {
    vi.spyOn(console, 'error').mockReturnValue(undefined);

    mockAuth.currentUser = currentUser;
    mockSignOut.mockReset();
    mockSignOut.mockImplementation(() => Promise.resolve());

    const backend = new FakeBackend(responseStatus);

    await render(HostComponent, {
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        { provide: HttpBackend, useValue: backend },
        { provide: REQUEST_URL, useValue: url },
        provideRouter([{ path: 'sign-in', component: SignInStub }]),
      ],
    });

    return { backend };
  }

  it('attaches a Bearer token to authenticated /api requests', async () => {
    const { backend } = await setup({
      currentUser: { uid: 'u1', getIdToken: () => Promise.resolve('test-token') },
    });

    screen.getByRole('button', { name: 'Fetch' }).click();

    await waitFor(() =>
      expect(backend.requests[0]?.headers.get('Authorization')).toBe('Bearer test-token'),
    );
  });

  it('leaves the request unmodified when no user is authenticated', async () => {
    const { backend } = await setup();

    screen.getByRole('button', { name: 'Fetch' }).click();

    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(backend.requests[0]!.headers.has('Authorization')).toBe(false);
  });

  it('does not touch requests to non-api paths', async () => {
    const { backend } = await setup({
      currentUser: { uid: 'u1', getIdToken: () => Promise.resolve('test-token') },
      url: '/assets/config.json',
    });

    screen.getByRole('button', { name: 'Fetch' }).click();

    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(backend.requests[0]!.headers.has('Authorization')).toBe(false);
  });

  it('signs out and redirects to sign-in on a 401 response', async () => {
    await setup({
      currentUser: { uid: 'u1', getIdToken: () => Promise.resolve('test-token') },
      responseStatus: 401,
    });

    screen.getByRole('button', { name: 'Fetch' }).click();

    expect(await screen.findByText('Sign-in page')).toBeVisible();
  });

  it('rethrows non-401 errors without signing out', async () => {
    await setup({
      currentUser: { uid: 'u1', getIdToken: () => Promise.resolve('test-token') },
      responseStatus: 500,
    });

    screen.getByRole('button', { name: 'Fetch' }).click();

    expect(await screen.findByText('Result: error')).toBeVisible();
    expect(screen.queryByText('Sign-in page')).not.toBeInTheDocument();
  });

  it('proceeds without a token when token acquisition fails', async () => {
    const { backend } = await setup({
      currentUser: {
        uid: 'u1',
        getIdToken: () => Promise.reject(new Error('network-request-failed')),
      },
    });

    screen.getByRole('button', { name: 'Fetch' }).click();

    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(backend.requests[0]!.headers.has('Authorization')).toBe(false);
  });
});
