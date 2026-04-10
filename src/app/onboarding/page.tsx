'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { generateInviteCode, generateAvatarColor } from '@/lib/utils';
import { DEFAULT_PERMISSIONS } from '@/types';
import { Users, PlusCircle, LogIn, Sparkles, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const familyRef = doc(collection(db, 'families'));
      const code = generateInviteCode();

      await setDoc(familyRef, {
        name: familyName.trim(),
        inviteCode: code,
        ownerId: user.uid,
        members: [user.uid],
        settings: { theme: 'auto', language: 'de' },
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        avatarColor: generateAvatarColor(user.email ?? ''),
        points: 0,
        createdAt: serverTimestamp(),
        familyId: familyRef.id,
        role: 'owner',
        permissions: DEFAULT_PERMISSIONS.owner,
      }, { merge: true });

      await refreshProfile();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'families'),
          where('inviteCode', '==', inviteCode.trim().toUpperCase())
        )
      );

      if (snap.empty) {
        setError('Ungültiger Einladungscode');
        return;
      }

      const familyDoc = snap.docs[0];

      await updateDoc(doc(db, 'families', familyDoc.id), {
        members: arrayUnion(user.uid),
      });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        avatarColor: generateAvatarColor(user.email ?? ''),
        points: 0,
        createdAt: serverTimestamp(),
        familyId: familyDoc.id,
        role: 'adult',
        permissions: DEFAULT_PERMISSIONS.adult,
      }, { merge: true });

      await refreshProfile();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Beitreten');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh relative overflow-hidden bg-cream-100 dark:bg-ink-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl animate-float"
          style={{ background: 'radial-gradient(circle, #8b5cf6, #ec4899, transparent)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl animate-float"
          style={{ background: 'radial-gradient(circle, #f97316, #eab308, transparent)', animationDelay: '2s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 shadow-widget">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-orange-500 mb-6 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          {mode === 'select' && (
            <>
              <h1 className="text-3xl font-bold mb-2">Fast geschafft!</h1>
              <p className="text-ink-500 mb-6">Erstelle eine Familie oder tritt einer bei</p>
              <div className="space-y-3">
                <button
                  onClick={() => setMode('create')}
                  className="w-full p-5 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white flex items-center gap-4 hover:scale-[1.02] transition-transform shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">Familie erstellen</div>
                    <div className="text-sm opacity-90">Starte euer gemeinsames Zuhause</div>
                  </div>
                </button>

                <button
                  onClick={() => setMode('join')}
                  className="w-full p-5 rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-700 flex items-center gap-4 hover:scale-[1.02] transition-transform"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <LogIn className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">Beitreten</div>
                    <div className="text-sm text-ink-500">Mit Einladungscode</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate}>
              <button type="button" onClick={() => { setMode('select'); setError(null); }} className="text-sm text-ink-500 mb-4">
                ← Zurück
              </button>
              <h1 className="text-3xl font-bold mb-2">Familie erstellen</h1>
              <p className="text-ink-500 mb-6">Wie heißt eure Familie?</p>
              <div className="relative mb-4">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  required
                  placeholder="z.B. Familie Wieland"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="input pl-12"
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl mb-4">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? 'Erstelle…' : 'Familie erstellen'}
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin}>
              <button type="button" onClick={() => { setMode('select'); setError(null); }} className="text-sm text-ink-500 mb-4">
                ← Zurück
              </button>
              <h1 className="text-3xl font-bold mb-2">Beitreten</h1>
              <p className="text-ink-500 mb-6">Gib den 6-stelligen Einladungscode ein</p>
              <div className="relative mb-4">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  required
                  maxLength={6}
                  placeholder="ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="input pl-12 uppercase tracking-widest text-center font-mono text-xl"
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl mb-4">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? 'Beitreten…' : 'Beitreten'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
