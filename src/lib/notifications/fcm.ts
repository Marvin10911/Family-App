import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getMessagingClient } from '@/lib/firebase/client';

/** Request permission, register SW, get FCM token, save to Firestore. */
export async function registerFcmToken(userId: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
    };

    const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams(config)}`;
    const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });

    const messaging = await getMessagingClient();
    if (!messaging) return 'unsupported';

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await updateDoc(doc(db, 'users', userId), { pushToken: token });
    }

    return 'granted';
  } catch (err) {
    console.error('FCM registration error:', err);
    return 'unsupported';
  }
}

/** Send a notification to all family members (except the sender). */
export async function notifyFamily(
  familyId: string,
  title: string,
  body: string,
  url = '/dashboard',
  excludeUserId?: string,
) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId, title, body, url, excludeUserId }),
    });
  } catch {
    // notifications are best-effort
  }
}
