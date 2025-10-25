'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

// This interface defines the shape of the user's authentication state.
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// This interface defines the complete state provided by the Firebase context.
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// This hook manages the user's authentication state by listening to auth changes.
function useAuthSubscription(auth: Auth | null): UserAuthState {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: auth?.currentUser || null, // Initialize with the current user if available.
    isUserLoading: true, // Start in a loading state.
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      // If there's no auth service, we're not loading and there's no user.
      setUserAuthState({ user: null, isUserLoading: false, userError: null });
      return;
    }

    // Subscribe to authentication state changes.
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        // When the user state is determined, update the state.
        setUserAuthState({ user, isUserLoading: false, userError: null });
      },
      (error) => {
        // If there's an error with the listener, update the state.
        console.error("FirebaseProvider: Auth state change error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );

    // Cleanup the subscription on unmount.
    return () => unsubscribe();
  }, [auth]); // Re-run the effect if the auth instance changes.

  return userAuthState;
}


// React Context for Firebase services.
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// The provider component that makes Firebase services available to the app.
export const FirebaseProvider: React.FC<{ children: ReactNode; firebaseApp: FirebaseApp | null; firestore: Firestore | null; auth: Auth | null; }> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const userAuthState = useAuthSubscription(auth);

  // Memoize the context value to prevent unnecessary re-renders.
  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    ...userAuthState,
  }), [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};


// Hook to easily access a specific Firebase service instance.
function useFirebaseService<T>(serviceName: 'app' | 'auth' | 'firestore'): T | null {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error(`useFirebaseService must be used within a FirebaseProvider.`);
  }
  switch (serviceName) {
    case 'app':
      return context.firebaseApp as T | null;
    case 'auth':
      return context.auth as T | null;
    case 'firestore':
      return context.firestore as T | null;
    default:
      return null;
  }
}

// Exported hooks for accessing individual services and user state.
export const useAuth = (): Auth | null => useFirebaseService<Auth>('auth');
export const useFirestore = (): Firestore | null => useFirebaseService<Firestore>('firestore');
export const useFirebaseApp = (): FirebaseApp | null => useFirebaseService<FirebaseApp>('app');
export const useUser = (): UserAuthState => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a FirebaseProvider.');
    }
    return { user: context.user, isUserLoading: context.isUserLoading, userError: context.userError };
};

// Hook for memoizing Firebase queries or references.
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  const memoized = useMemo(factory, deps);
  
  if (typeof memoized === 'object' && memoized !== null) {
    // Tag the memoized object to ensure it's used correctly in other hooks.
    (memoized as T & { __memo?: boolean }).__memo = true;
  }
  
  return memoized;
}
