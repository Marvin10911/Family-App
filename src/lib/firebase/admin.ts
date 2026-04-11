import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

// Lazy-initialize Admin SDK so module import during `next build` doesn't throw
let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // Vercel kann den Key mit echten Zeilenumbrüchen ODER mit literal \n speichern.
  // Außerdem entfernen wir umschließende Anführungszeichen, die beim Einfügen
  // ins Vercel-Dashboard versehentlich mit kopiert werden können.
  const rawKey = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/^"+|"+$/g, '');
  const privateKey = rawKey.includes('\\n')
    ? rawKey.replace(/\\n/g, '\n')
    : rawKey;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin env vars missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  _app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return _app;
}

// Export getters instead of instances — they're called at request time, not build time
export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_t, prop) {
    return (getFirestore(getAdminApp()) as any)[prop];
  },
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_t, prop) {
    return (getAuth(getAdminApp()) as any)[prop];
  },
});

export const adminMessaging = new Proxy({} as ReturnType<typeof getMessaging>, {
  get(_t, prop) {
    return (getMessaging(getAdminApp()) as any)[prop];
  },
});
