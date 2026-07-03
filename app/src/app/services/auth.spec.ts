import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth } from './auth';

interface MockUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

// Mock at the firebase SDK boundary; lib/firebase re-exports getAuth()'s result
// as the shared `auth` singleton the service consumes.
const {
  mockAuth,
  mockSignIn,
  mockCreateUser,
  mockSendVerification,
  mockOnIdTokenChanged,
} = vi.hoisted(() => ({
  mockAuth: { currentUser: undefined as MockUser | null | undefined },
  mockSignIn: vi.fn(),
  mockCreateUser: vi.fn(),
  mockSendVerification: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  mockOnIdTokenChanged: vi.fn(() => vi.fn()),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  connectAuthEmulator: vi.fn(),
  onIdTokenChanged: mockOnIdTokenChanged,
  getIdTokenResult: vi.fn(),
  signInWithEmailAndPassword: mockSignIn,
  createUserWithEmailAndPassword: mockCreateUser,
  sendEmailVerification: mockSendVerification,
  signInWithPopup: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  GoogleAuthProvider: class {},
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
}));

function makeService(): Auth {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  return TestBed.inject(Auth);
}

describe('Auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockReturnValue(undefined);
    mockAuth.currentUser = null;
  });

  it('constructs and exposes the current user', () => {
    mockAuth.currentUser = { uid: 'u1', email: 't@example.com', emailVerified: true };
    const service = makeService();
    expect(service.currentUser?.uid).toBe('u1');
  });

  it('signs in with email and password', async () => {
    mockSignIn.mockResolvedValue({ user: { uid: 'u1' } });
    const service = makeService();

    await service.signInWithEmailPassword('t@example.com', 'password123');

    expect(mockSignIn).toHaveBeenCalledWith(mockAuth, 't@example.com', 'password123');
  });

  it('translates firebase error codes into friendly messages', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    const service = makeService();

    await expect(
      service.signInWithEmailPassword('t@example.com', 'wrong'),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('sends a verification email on sign-up', async () => {
    mockCreateUser.mockResolvedValue({ user: { uid: 'u2' } });
    const service = makeService();

    await service.signUpWithEmailPassword('new@example.com', 'password123');

    expect(mockCreateUser).toHaveBeenCalledWith(mockAuth, 'new@example.com', 'password123');
    expect(mockSendVerification).toHaveBeenCalledOnce();
  });
});
