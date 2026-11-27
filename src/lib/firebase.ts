import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  enableNetwork,
  Firestore,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const BOOTSTRAP_ADMIN_EMAIL = 'khalid134099@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isOfflineOrTransientError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '').toLowerCase()
      : '';
  return (
    code === 'unavailable' ||
    msg.includes('client is offline') ||
    msg.includes('network') ||
    msg.includes('failed to get document') ||
    msg.includes('could not reach cloud firestore')
  );
}

export async function ensureFirestoreNetwork(): Promise<void> {
  try {
    await enableNetwork(db);
  } catch {
    // Ignore if already enabled or browser is strictly offline
  }
}

export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      await ensureFirestoreNetwork();
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        return true;
      } catch (retryError) {
        if (
          retryError instanceof Error &&
          retryError.message.includes('the client is offline') &&
          (typeof navigator === 'undefined' || navigator.onLine)
        ) {
          console.error('Please check your Firebase configuration.');
        }
        return false;
      }
    }
    return true;
  }
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

export async function requestBrowserAndFcmNotifications(): Promise<{
  granted: boolean;
  fcmToken: string;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, fcmToken: '' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { granted: false, fcmToken: '' };
  }

  const swReg = await registerNotificationServiceWorker();
  let fcmToken = '';

  try {
    const supported = await isSupported();
    if (supported && swReg) {
      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (vapidKey) {
        fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swReg,
        });
      }
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'Ms nardeen Academy';
        const body = payload.notification?.body || '';
        triggerLocalPushNotification(title, body);
      });
    }
  } catch (err) {
    console.warn('FCM optional token check skipped:', err);
  }

  return { granted: true, fcmToken };
}

export async function triggerLocalPushNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker?.getRegistration('/sw.js');
    if (reg) {
      await reg.showNotification(title, {
        body,
        tag: `academy-${Date.now()}`,
      });
      return;
    }
  } catch {
    // Fallback to Notification constructor below
  }

  try {
    new Notification(title, { body });
  } catch {
    // Some embedded mobile contexts disallow direct Notification constructor
  }
}
