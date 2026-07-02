import { isDevMode } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAh8jz9zS_oM_kGGEmAUMR6XC-ka68lzdE',
  authDomain: 'merit-badge-university.firebaseapp.com',
  projectId: 'merit-badge-university',
  storageBucket: 'merit-badge-university.firebasestorage.app',
  messagingSenderId: '643912800060',
  appId: '1:643912800060:web:dfc504cd7cc7caa5167039',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

if (isDevMode()) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8090);
}
