'use server';

import * as admin from 'firebase-admin';

// Define a symbol to attach the admin app to the global object.
// This prevents re-initialization in the hot-reloading server environment.
const ADMIN_APP_SYMBOL = Symbol.for('firebase-admin-app');

/**
 * Initializes the Firebase Admin SDK if it hasn't been already,
 * using a singleton pattern to prevent re-initialization errors.
 * This is the correct way to handle firebase-admin in a Next.js/serverless environment.
 */
function initializeAdmin() {
  if (typeof (global as any)[ADMIN_APP_SYMBOL] === 'undefined') {
    (global as any)[ADMIN_APP_SYMBOL] = admin.initializeApp();
  }
  return (global as any)[ADMIN_APP_SYMBOL];
}

export { initializeAdmin };
