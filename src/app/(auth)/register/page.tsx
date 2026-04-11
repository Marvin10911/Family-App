'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Sparkles, Mail, Lock, User, ArrowRight, MailCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, name);
      setDone(true);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('Diese E-Mail ist bereits registriert. Bitte anmelden.');
      } else if (code === 'auth/weak-password') {
        setError('Passwort zu kurz (mindestens 6 Zeichen).');
      } else if (code === 'auth/invalid-email') {
        setError('Ungültige E-Mail-Adresse.');
      } else if (code === 'auth/network-request-failed') {
        setError('Keine Internetverbindung.');
      } else {
        setError(`Fehler: ${err?.message ?? 'Unbekannter Fehler'}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {done ? (
          /* ── E-Mail-Bestätigungs-Screen ── */
          <motion.div
            key="verify"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl p-8 shadow-widget text-center space-y-5"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 14 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto shadow-lg"
            >
              <MailCheck className="w-10 h-10 text-white" />
            </motion.div>

            <div>
              <h1 className="text-2xl font-bold mb-2">Bestätige deine E-Mail</h1>
              <p className="text-ink-500 dark:text-ink-300 text-sm leading-relaxed">
                Wir haben eine Bestätigungsmail an{' '}
                <span className="font-semibold text-ink-800 dark:text-white">{email}</span>{' '}
                gesendet. Bitte klicke auf den Link in der E-Mail, bevor du dich anmeldest.
              </p>
            </div>

            <div className="bg-ink-50 dark:bg-ink-800 rounded-2xl px-4 py-3 text-xs text-ink-500 text-left space-y-1">
              <div className="font-semibold text-ink-700 dark:text-ink-300">Keine E-Mail erhalten?</div>
              <div>Überprüfe deinen Spam-Ordner. Die E-Mail kommt von Firebase / noreply@...</div>
            </div>

            <Link
              href="/login"
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
            >
              Zur Anmeldung <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          /* ── Registrierungsformular ── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-3xl p-8 shadow-widget"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 mb-6 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <h1 className="text-3xl font-bold mb-2">Willkommen 👋</h1>
            <p className="text-ink-500 dark:text-ink-100 mb-6">
              Erstelle deinen Account und starte mit deiner Familie
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  type="text"
                  required
                  placeholder="Dein Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input pl-12"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  type="email"
                  required
                  placeholder="E-Mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-12"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Passwort (min. 6 Zeichen)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-12"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? 'Registrieren…' : 'Account erstellen'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-ink-500">
              Schon ein Account?{' '}
              <Link href="/login" className="font-semibold text-ink-900 dark:text-white hover:underline">
                Anmelden
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
