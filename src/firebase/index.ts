'use client';

// Export all the necessary hooks and providers for easy access throughout the app.
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

// Export core Firestore functions for convenience.
export { collection, doc, deleteDoc } from 'firebase/firestore';
