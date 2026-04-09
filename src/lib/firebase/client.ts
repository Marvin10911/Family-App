import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getClientApp(): FirebaseApp {
  if (_app) return _app;
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Firebase not configured. Set NEXT_PUBLIC_FIREBASE_* env variables.'
    );
  }
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

// Lazy proxy that only initializes when actually accessed (client-side)
export const app = new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    return (getClientApp() as any)[prop];
  },
});

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = getAuth(getClientApp());
    return (_auth as any)[prop];
  },
});

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) _db = getFirestore(getClientApp());
    return (_db as any)[prop];
  },
});

export const getMessagingClient = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(getClientApp());
};
