'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Sparkles, Mail, Lock, ArrowRight, MailCheck, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';

type View = 'login' | 'reset' | 'reset-done' | 'unverified';

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, sendPasswordReset, user, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('login');
  const justVerified = params.get('verified') === 'true';

  useEffect(() => {
    if (!loading && user && profile?.familyId) router.replace('/dashboard');
    else if (!loading && user && !profile?.familyId) router.replace('/onboarding');
  }, [loading, user, profile, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/email-not-verified') {
        setView('unverified');
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setError('E-Mail oder Passwort falsch.');
      } else if (code === 'auth/too-many-requests') {
        setError('Zu viele Versuche. Bitte kurz warten.');
      } else if (code === 'auth/network-request-failed') {
        setError('Keine Internetverbindung.');
      } else {
        setError(`Fehler: ${err?.message ?? 'Anmeldung fehlgeschlagen'}`);
      }
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Try via Resend first (nicer email, no spam), fallback to Firebase
      const res = await fetch('/api/auth/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.method === 'firebase-fallback') {
        await sendPasswordReset(email);
      }
      setView('reset-done');
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setError('Keine Registrierung mit dieser E-Mail gefunden.');
      } else {
        setError(`Fehler: ${err?.message ?? 'Unbekannter Fehler'}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">

        {/* ── Login ── */}
        {view === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-3xl p-8 shadow-widget"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 mb-6 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <h1 className="text-3xl font-bold mb-2">Willkommen zurück</h1>
            <p className="text-ink-500 dark:text-ink-100 mb-6">Melde dich bei eurer Familie an</p>

            {justVerified && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm font-medium mb-4">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                E-Mail erfolgreich bestätigt! Du kannst dich jetzt anmelden.
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  type="email" required placeholder="E-Mail"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input pl-12"
                />
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                  <input
                    type="password" required placeholder="Passwort"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="input pl-12"
                  />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setView('reset'); setError(null); }}
                    className="text-xs text-violet-500 hover:text-violet-600 font-medium"
                  >
                    Passwort vergessen?
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5">
                {submitting ? 'Anmelden…' : 'Anmelden'}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-ink-500">
              Noch keinen Account?{' '}
              <Link href="/register" className="font-semibold text-ink-900 dark:text-white hover:underline">
                Registrieren
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── E-Mail nicht bestätigt ── */}
        {view === 'unverified' && (
          <motion.div
            key="unverified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl p-8 shadow-widget text-center space-y-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 14 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg"
            >
              <MailCheck className="w-10 h-10 text-white" />
            </motion.div>

            <div>
              <h2 className="text-2xl font-bold mb-2">E-Mail bestätigen</h2>
              <p className="text-ink-500 dark:text-ink-300 text-sm leading-relaxed">
                Wir haben eine neue Bestätigungsmail an{' '}
                <span className="font-semibold text-ink-800 dark:text-white">{email}</span>{' '}
                gesendet. Bitte bestätige zuerst deine E-Mail-Adresse.
              </p>
            </div>

            <div className="bg-ink-50 dark:bg-ink-800 rounded-2xl px-4 py-3 text-xs text-ink-500 text-left">
              Kein E-Mail? Überprüfe deinen Spam-Ordner oder versuche dich erneut anzumelden — wir senden dann automatisch eine neue.
            </div>

            <button
              onClick={() => { setView('login'); setError(null); }}
              className="w-full py-3 rounded-2xl bg-ink-100 dark:bg-ink-800 font-semibold text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück zur Anmeldung
            </button>
          </motion.div>
        )}

        {/* ── Passwort zurücksetzen ── */}
        {view === 'reset' && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-3xl p-8 shadow-widget"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 mb-6 shadow-lg">
              <KeyRound className="w-7 h-7 text-white" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Passwort zurücksetzen</h1>
            <p className="text-ink-500 dark:text-ink-100 mb-6 text-sm">
              Gib deine E-Mail ein — wir schicken dir einen Link zum Zurücksetzen.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  type="email" required placeholder="E-Mail"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input pl-12"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5">
                {submitting ? 'Senden…' : 'Reset-Link senden'}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <button
              onClick={() => { setView('login'); setError(null); }}
              className="mt-4 w-full text-center text-sm text-ink-500 hover:text-ink-700 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Anmeldung
            </button>
          </motion.div>
        )}

        {/* ── Reset-Mail gesendet ── */}
        {view === 'reset-done' && (
          <motion.div
            key="reset-done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl p-8 shadow-widget text-center space-y-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 14 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-lg"
            >
              <MailCheck className="w-10 h-10 text-white" />
            </motion.div>

            <div>
              <h2 className="text-2xl font-bold mb-2">E-Mail gesendet!</h2>
              <p className="text-ink-500 dark:text-ink-300 text-sm leading-relaxed">
                Wir haben einen Reset-Link an{' '}
                <span className="font-semibold text-ink-800 dark:text-white">{email}</span>{' '}
                geschickt. Klicke auf den Link um dein Passwort zu ändern.
              </p>
            </div>

            <button
              onClick={() => { setView('login'); setError(null); }}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
            >
              Zur Anmeldung <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
