'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  User as FbUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { UserProfile, Family, DEFAULT_PERMISSIONS } from '@/types';
import { generateAvatarColor } from '@/lib/utils';

interface AuthContextValue {
  user: FbUser | null;
  profile: UserProfile | null;
  family: Family | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FbUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  // Hold the inner profile-listener unsubscribe so we can tear it down cleanly
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      // Tear down previous profile listener whenever the auth user changes
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      setUser(fbUser);

      if (!fbUser) {
        setProfile(null);
        setFamily(null);
        setLoading(false);
        return;
      }

      // Subscribe to the user's profile document
      const userRef = doc(db, 'users', fbUser.uid);
      const unsubProfile = onSnapshot(
        userRef,
        async (snap) => {
          if (!snap.exists()) {
            // Profile not yet written (e.g. registration still in progress)
            setProfile(null);
            setFamily(null);
            setLoading(false);
            return;
          }

          const data = { id: snap.id, ...snap.data() } as UserProfile;
          setProfile(data);

          if (data.familyId) {
            try {
              const famSnap = await getDoc(doc(db, 'families', data.familyId));
              setFamily(
                famSnap.exists()
                  ? ({ id: famSnap.id, ...famSnap.data() } as Family)
                  : null
              );
            } catch {
              setFamily(null);
            }
          } else {
            setFamily(null);
          }

          setLoading(false);
        },
        (_err) => {
          // Firestore error (e.g. rules block) — still resolve loading
          setProfile(null);
          setFamily(null);
          setLoading(false);
        }
      );

      profileUnsubRef.current = unsubProfile;

      // Fire-and-forget last-seen update (non-critical)
      updateDoc(userRef, { lastSeen: serverTimestamp() }).catch(() => {});
    });

    return () => {
      unsubAuth();
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // loading will be set to false by the onSnapshot callback above
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });

      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName,
        avatarColor: generateAvatarColor(email),
        familyId: null,
        role: 'owner',
        permissions: DEFAULT_PERMISSIONS.owner,
        points: 0,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });
      // The onSnapshot listener will pick up the new doc and set loading=false
    },
    []
  );

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      setProfile({ id: snap.id, ...snap.data() } as UserProfile);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, profile, family, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
