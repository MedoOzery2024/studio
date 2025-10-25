'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, collection, doc, deleteDoc } from 'firebase/firestore';

// This function initializes and returns the Firebase services.
// It ensures that initialization happens only once.
export function initializeFirebase(): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } {
  // Check if Firebase has already been initialized.
  if (getApps().length === 0) {
    // If not initialized, initialize the Firebase app with the provided config.
    initializeApp(firebaseConfig);
  }

  // Get the initialized app.
  const firebaseApp = getApp();
  // Get the Auth and Firestore services.
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  // Return the services.
  return { firebaseApp, auth, firestore };
}


// Export all the necessary hooks and providers for easy access throughout the app.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

// Export core Firestore functions for convenience.
export { collection, doc, deleteDoc };
