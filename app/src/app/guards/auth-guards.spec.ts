import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  RouterOutlet,
  provideRouter,
  type Routes,
} from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it, vi } from 'vitest';
import type { BootstrapResponse } from '../api-types/users-api.types';
import { Auth } from '../services/auth';
import {
  requireAuth,
  requireOnboarded,
  requireUnauth,
  requireVerified,
} from './auth-guards';

// The Angular unit-test system disallows vi.mock on relative imports, so we
// mock at the firebase SDK boundary instead.
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    currentUser: undefined as
      | { uid: string; emailVerified: boolean }
      | null
      | undefined,
    authStateReady: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  },
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  connectAuthEmulator: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
}));

@Component({ selector: 'app-mock-home', template: '<h1>Home</h1>', changeDetection: ChangeDetectionStrategy.OnPush })
class MockHome {}
@Component({ selector: 'app-mock-sign-in', template: '<h1>Sign In</h1>', changeDetection: ChangeDetectionStrategy.OnPush })
class MockSignIn {}
@Component({ selector: 'app-mock-verify', template: '<h1>Verify</h1>', changeDetection: ChangeDetectionStrategy.OnPush })
class MockVerify {}
@Component({ selector: 'app-mock-onboarding', template: '<h1>Onboarding</h1>', changeDetection: ChangeDetectionStrategy.OnPush })
class MockOnboarding {}
@Component({ selector: 'app-mock-protected', template: '<h1>Protected</h1>', changeDetection: ChangeDetectionStrategy.OnPush })
class MockProtected {}
@Component({
  template: '<router-outlet></router-outlet>',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class MockApp {}

const routes: Routes = [
  { path: '', component: MockHome },
  { path: 'sign-in', component: MockSignIn },
  { path: 'verify-email', component: MockVerify },
  { path: 'onboarding', component: MockOnboarding },
  { path: 'protected', component: MockProtected, canActivate: [requireAuth] },
  { path: 'verified-only', component: MockProtected, canActivate: [requireVerified] },
  { path: 'guest-only', component: MockSignIn, canActivate: [requireUnauth] },
  { path: 'onboarded-only', component: MockProtected, canActivate: [requireOnboarded] },
];

describe('auth route guards', () => {
  describe('requireAuth', () => {
    it('redirects an unauthenticated user to sign-in', async () => {
      const { navigate } = await setup();
      await navigate('/protected');
      expect(screen.getByText('Sign In')).toBeVisible();
    });

    it('allows an authenticated user through', async () => {
      const { navigate } = await setup({
        currentUser: { uid: 'u1', emailVerified: true },
      });
      await navigate('/protected');
      expect(screen.getByText('Protected')).toBeVisible();
    });
  });

  describe('requireVerified', () => {
    it('redirects an unverified user to verify-email', async () => {
      const { navigate } = await setup({
        currentUser: { uid: 'u1', emailVerified: false },
      });
      await navigate('/verified-only');
      expect(screen.getByText('Verify')).toBeVisible();
    });

    it('allows a verified user through', async () => {
      const { navigate } = await setup({
        currentUser: { uid: 'u1', emailVerified: true },
      });
      await navigate('/verified-only');
      expect(screen.getByText('Protected')).toBeVisible();
    });
  });

  describe('requireUnauth', () => {
    it('redirects an authenticated user to the app home', async () => {
      const { navigate } = await setup({
        currentUser: { uid: 'u1', emailVerified: true },
      });
      await navigate('/guest-only');
      expect(screen.getByText('Home')).toBeVisible();
    });

    it('allows an unauthenticated user to reach the guest-only page', async () => {
      const { navigate } = await setup();
      await navigate('/guest-only');
      expect(screen.getByText('Sign In')).toBeVisible();
    });
  });

  describe('requireOnboarded', () => {
    it('redirects to onboarding when consent is still needed', async () => {
      const { navigate } = await setup({
        bootstrap: { user: fakeUser(), needsConsent: true },
      });
      await navigate('/onboarded-only');
      expect(screen.getByText('Onboarding')).toBeVisible();
    });

    it('allows a fully onboarded user through', async () => {
      const { navigate } = await setup({
        bootstrap: { user: fakeUser(), needsConsent: false },
      });
      await navigate('/onboarded-only');
      expect(screen.getByText('Protected')).toBeVisible();
    });
  });
});

function fakeUser() {
  return {
    uid: 'u1',
    displayName: 'Test',
    email: 't@example.com',
    phone: null,
    acceptedTermsAt: null,
    acceptedPrivacyAt: null,
  };
}

interface SetupOptions {
  currentUser?: { uid: string; emailVerified: boolean } | null;
  bootstrap?: BootstrapResponse | undefined;
}

async function setup({ currentUser, bootstrap }: SetupOptions = {}) {
  vi.spyOn(console, 'error').mockReturnValue(undefined);
  mockAuth.currentUser = currentUser;
  mockAuth.authStateReady = vi.fn(() => Promise.resolve());

  const mockAuthService = {
    ensureBootstrap: vi.fn(() => Promise.resolve(bootstrap)),
  };

  await render(MockApp, {
    providers: [
      provideRouter(routes),
      { provide: Auth, useValue: mockAuthService },
    ],
  });

  const router = TestBed.inject(Router);
  const navigate = async (path: string) => {
    await router.navigateByUrl(path);
  };

  return { navigate };
}
