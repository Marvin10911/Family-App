'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password, name);
      router.push('/onboarding');
    } catch (err: any) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'E-Mail bereits registriert'
          : err.code === 'auth/weak-password'
          ? 'Passwort zu schwach (min. 6 Zeichen)'
          : 'Registrierung fehlgeschlagen'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-3xl p-8 shadow-widget">
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5"
          >
            {loading ? 'Registrieren…' : 'Account erstellen'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-500">
          Schon ein Account?{' '}
          <Link
            href="/login"
            className="font-semibold text-ink-900 dark:text-white hover:underline"
          >
            Anmelden
          </Link>
        </div>
      </div>
    </div>
  );
}
