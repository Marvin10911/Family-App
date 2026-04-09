'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
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
import {
  UserProfile,
  Family,
  DEFAULT_PERMISSIONS,
} from '@/types';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (!fbUser) {
        setProfile(null);
        setFamily(null);
        setLoading(false);
        return;
      }

      // Listen to profile changes
      const userRef = doc(db, 'users', fbUser.uid);
      const unsubProfile = onSnapshot(userRef, async (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as UserProfile;
          setProfile(data);

          if (data.familyId) {
            const famRef = doc(db, 'families', data.familyId);
            const famSnap = await getDoc(famRef);
            if (famSnap.exists()) {
              setFamily({ id: famSnap.id, ...famSnap.data() } as Family);
            }
          } else {
            setFamily(null);
          }
        }
        setLoading(false);
      });

      // Update last seen
      try {
        await updateDoc(userRef, { lastSeen: serverTimestamp() });
      } catch {}

      return () => unsubProfile();
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });

      const profileData: Omit<UserProfile, 'id'> = {
        email,
        displayName,
        avatarColor: generateAvatarColor(email),
        familyId: null,
        role: 'owner',
        permissions: DEFAULT_PERMISSIONS.owner,
        points: 0,
        createdAt: serverTimestamp() as any,
        lastSeen: serverTimestamp() as any,
      };

      await setDoc(doc(db, 'users', cred.user.uid), profileData);
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
