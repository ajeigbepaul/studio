import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function initAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env variable is not set');
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, 'base64').toString('utf-8')
  );

  return initializeApp({ credential: cert(serviceAccount) });
}

const adminApp = initAdminApp();

export const adminDb   = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export { FieldValue };
