'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from './non-blocking-login';
import { Auth, onAuthStateChanged } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * An internal component that handles the anonymous authentication lifecycle.
 * It ensures a user is always signed in.
 */
function AuthHandler({ auth }: { auth: Auth | null }) {
  useEffect(() => {
    // Do nothing if the auth service isn't available yet.
    if (!auth) return;

    // Set up a listener for authentication state changes.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If the user is null (not signed in), initiate a new anonymous sign-in.
      if (!user) {
        initiateAnonymousSignIn(auth);
      }
    });

    // Cleanup the subscription when the component unmounts.
    return () => unsubscribe();
  }, [auth]); // Re-run the effect if the auth instance changes.

  return null; // This component does not render anything to the UI.
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per provider mount.
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AuthHandler auth={firebaseServices.auth} />
      {children}
    </FirebaseProvider>
  );
}
