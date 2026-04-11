'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/client';
import { motion } from 'framer-motion';
import {
  User, Pencil, Check, X, LogOut, Settings,
  KeyRound, Cake, ChevronRight, Mail,
} from 'lucide-react';
import Link from 'next/link';

const AVATAR_COLORS = [
  '#8b5cf6', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#ef4444', '#f59e0b', '#06b6d4',
  '#6366f1', '#84cc16', '#e879f9', '#14b8a6',
];

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile, sendPasswordReset } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  const [showColors, setShowColors] = useState(false);
  const [savingColor, setSavingColor] = useState(false);

  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function saveName() {
    if (!newName.trim() || !user || !profile) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: newName.trim() });
      await updateDoc(doc(db, 'users', profile.id), { displayName: newName.trim() });
      await refreshProfile();
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

  async function saveColor(color: string) {
    if (!profile) return;
    setSavingColor(true);
    try {
      await updateDoc(doc(db, 'users', profile.id), { avatarColor: color });
      await refreshProfile();
      setShowColors(false);
    } finally {
      setSavingColor(false);
    }
  }

  async function handlePasswordReset() {
    if (!profile?.email || resetLoading) return;
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await fetch('/api/auth/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json();
      if (data.method === 'firebase-fallback') {
        await sendPasswordReset(profile.email);
      }
      setResetSent(true);
    } catch (err: any) {
      setResetError('Fehler beim Senden. Bitte nochmal versuchen.');
      console.error('[profile] password reset error:', err);
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  if (!profile) return null;

  return (
    <div className="space-y-5 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold pt-2"
      >
        Profil
      </motion.div>

      {/* Avatar + Name */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-3xl p-6 shadow-widget"
      >
        <div className="flex items-center gap-4 mb-5">
          {/* Avatar */}
          <button
            onClick={() => setShowColors(!showColors)}
            className="relative flex-shrink-0"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: profile.avatarColor }}
            >
              {getInitials(profile.displayName)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-ink-800 rounded-full border border-ink-200 dark:border-ink-600 flex items-center justify-center shadow">
              <Pencil className="w-3 h-3 text-ink-500" />
            </div>
          </button>

          {/* Name */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="input py-2 text-lg font-bold flex-1"
                />
                <button onClick={saveName} disabled={savingName} className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingName(false); setNewName(profile.displayName); }} className="w-9 h-9 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div>
                  <div className="font-bold text-xl leading-tight">{profile.displayName}</div>
                  <div className="text-sm text-ink-500 mt-0.5">{profile.email}</div>
                </div>
                <button
                  onClick={() => { setEditingName(true); setNewName(profile.displayName); }}
                  className="ml-auto w-8 h-8 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5 text-ink-500" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Color picker */}
        {showColors && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-ink-100 dark:border-ink-700">
              <p className="text-xs text-ink-500 mb-3 font-medium">Avatar-Farbe wählen</p>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => saveColor(color)}
                    disabled={savingColor}
                    className="w-full aspect-square rounded-xl transition-transform active:scale-90 relative"
                    style={{ backgroundColor: color }}
                  >
                    {profile.avatarColor === color && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-3xl overflow-hidden shadow-widget divide-y divide-ink-100 dark:divide-ink-700"
      >
        <button
          onClick={handlePasswordReset}
          disabled={resetSent || resetLoading}
          className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-ink-50 dark:active:bg-ink-800 transition-colors disabled:opacity-60"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Passwort ändern</div>
            {resetLoading
              ? <div className="text-xs text-ink-400">Wird gesendet…</div>
              : resetSent
              ? <div className="text-xs text-green-600 dark:text-green-400">Reset-Link gesendet ✓</div>
              : resetError
              ? <div className="text-xs text-red-500">{resetError}</div>
              : <div className="text-xs text-ink-500">Link per E-Mail erhalten</div>
            }
          </div>
          <ChevronRight className="w-4 h-4 text-ink-400" />
        </button>

        <Link
          href="/birthdays"
          className="flex items-center gap-3 px-5 py-4 active:bg-ink-50 dark:active:bg-ink-800 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-pink-100 dark:bg-pink-950 flex items-center justify-center flex-shrink-0">
            <Cake className="w-4.5 h-4.5 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Geburtstage</div>
            <div className="text-xs text-ink-500">Verwalten & erinnern</div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-400" />
        </Link>

        <Link
          href="/admin"
          className="flex items-center gap-3 px-5 py-4 active:bg-ink-50 dark:active:bg-ink-800 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center flex-shrink-0">
            <Settings className="w-4.5 h-4.5 text-ink-500" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">App-Einstellungen</div>
            <div className="text-xs text-ink-500">Familie, Theme, Benachrichtigungen</div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-400" />
        </Link>
      </motion.div>

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-sm active:opacity-70 transition-opacity"
        >
          <LogOut className="w-4 h-4" />
          Abmelden
        </button>
      </motion.div>
    </div>
  );
}
