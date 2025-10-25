'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// --- Interfaces ---
interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// --- Context ---
const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

// --- Auth Subscription Hook ---
function useAuthSubscription(auth: Auth): { user: User | null; isUserLoading: boolean; userError: Error | null } {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (newUser) => {
        setUser(newUser);
        setIsUserLoading(false);
        // If the user logs out or the session expires, sign in anonymously again.
        if (!newUser) {
          signInAnonymously(auth).catch((error) => {
            console.error("Anonymous re-sign-in failed:", error);
            setUserError(error);
          });
        }
      },
      (error) => {
        console.error("Auth state change error:", error);
        setUserError(error);
        setIsUserLoading(false);
      }
    );
    
    // Ensure initial sign-in if no user is present on mount
    if (!auth.currentUser) {
        signInAnonymously(auth).catch((error) => {
            console.error("Initial anonymous sign-in failed:", error);
            setUserError(error);
        });
    }


    return () => unsubscribe();
  }, [auth]);

  return { user, isUserLoading, userError };
}


// --- Provider Component ---
function FirebaseProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    return { firebaseApp: app, auth, firestore };
  }, []);

  const { user, isUserLoading, userError } = useAuthSubscription(firebaseServices.auth);

  const contextValue = useMemo((): FirebaseContextValue => ({
    ...firebaseServices,
    user,
    isUserLoading,
    userError,
  }), [firebaseServices, user, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}


// --- Client Provider Wrapper ---
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // This component ensures FirebaseProvider and its context are only rendered on the client.
  return <FirebaseProvider>{children}</FirebaseProvider>;
}


// --- Exported Hooks for component consumption ---
function useFirebaseContext() {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebaseContext must be used within a FirebaseProvider.');
    }
    return context;
}

export const useAuth = (): Auth => useFirebaseContext().auth;
export const useFirestore = (): Firestore => useFirebaseContext().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebaseContext().firebaseApp;
export const useUser = (): { user: User | null, isUserLoading: boolean, userError: Error | null } => {
    const { user, isUserLoading, userError } = useFirebaseContext();
    return { user, isUserLoading, userError };
};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  
  if (typeof memoized === 'object' && memoized !== null) {
    (memoized as T & { __memo?: boolean }).__memo = true;
  }
  
  return memoized;
}
