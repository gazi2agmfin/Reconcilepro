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
    // Prefer explicit service account JSON provided in `FIREBASE_SERVICE_ACCOUNT` env var
    // for local development. In production on GCP, Application Default Credentials
    // or GOOGLE_APPLICATION_CREDENTIALS should be used instead.
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        (global as any)[ADMIN_APP_SYMBOL] = admin.initializeApp({
          credential: admin.credential.cert(key as admin.ServiceAccount),
        });
      } catch (err) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err);
        // fallback to default initialization which may work when running in GCP
        (global as any)[ADMIN_APP_SYMBOL] = admin.initializeApp();
      }
    } else {
      // No explicit service account provided — rely on Application Default Credentials
      // (e.g., GOOGLE_APPLICATION_CREDENTIALS) or environment where the runtime
      // has IAM privileges.
      (global as any)[ADMIN_APP_SYMBOL] = admin.initializeApp();
    }
  }
  return (global as any)[ADMIN_APP_SYMBOL];
}

export { initializeAdmin };
