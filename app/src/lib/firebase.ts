import { initializeApp } from 'firebase/app';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';

// Not a secret. The browser API key only identifies the Firebase project. The
// access boundary is the ID token verification in the API.
const firebaseConfig = {
  apiKey: 'AIzaSyAh8jz9zS_oM_kGGEmAUMR6XC-ka68lzdE',
  authDomain: 'merit-badge-university.firebaseapp.com',
  projectId: 'merit-badge-university',
  storageBucket: 'merit-badge-university.firebasestorage.app',
  messagingSenderId: '643912800060',
  appId: '1:643912800060:web:dfc504cd7cc7caa5167039',
};

// The instance is a property of an object, not a module-level `let`, so that
// the first call does not reassign a top-level binding.
const instance: { auth?: Auth } = {};

/**
 * Returns the Firebase Auth instance of the app. The first call initializes the
 * Firebase app and, when `VITE_FIREBASE_AUTH_EMULATOR_HOST` is set
 * (`.env.development`), connects the Auth emulator. Later calls return the same
 * instance.
 *
 * This is the only module that calls `initializeApp` and `getAuth`. The client
 * uses Auth only: all data access goes through the API (#228, decision 11).
 */
export function getFirebaseAuth(): Auth {
  if (instance.auth) return instance.auth;

  const auth = getAuth(initializeApp(firebaseConfig));
  instance.auth = auth;
  const emulatorHost = import.meta.env['VITE_FIREBASE_AUTH_EMULATOR_HOST'] as string | undefined;
  if (emulatorHost) {
    connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
  }
  return auth;
}
