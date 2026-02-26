
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This is a global cache for the admin app instance
const globalForFirebase = globalThis as unknown as {
  adminApp: admin.app.App | undefined;
};

async function initializeAdminApp() {
  if (globalForFirebase.adminApp) {
    return globalForFirebase.adminApp;
  }

  // Validate environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not set');
  }
  if (!clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL environment variable is not set');
  }
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
  }

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };

  try {
    const newAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    }, 'admin-app-for-server-actions');

    globalForFirebase.adminApp = newAdminApp;
    return newAdminApp;
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
       console.warn('Firebase admin app already initialized, returning existing instance.');
       return admin.app('admin-app-for-server-actions');
    }
    console.error('Firebase admin initialization error:', error);
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
}

export async function getAdminServices() {
    const app = await initializeAdminApp();
    return {
        auth: app.auth(),
        db: app.database(),
    };
}
