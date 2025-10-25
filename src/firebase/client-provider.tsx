'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider, useFirebase } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from './non-blocking-login';
import { Auth, onAuthStateChanged, User } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

function AuthHandler({ auth }: { auth: Auth | null }) {
  useEffect(() => {
    if (!auth) return;

    // Initially, if there's no user, sign in anonymously.
    if (!auth.currentUser) {
      initiateAnonymousSignIn(auth);
    }
    
    // Then, listen for any future auth state changes.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // If the user signs out, sign them back in anonymously.
        initiateAnonymousSignIn(auth);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  return null; // This component does not render anything
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

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
