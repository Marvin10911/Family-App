'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.code === 'auth/invalid-credential'
          ? 'Ungültige Zugangsdaten'
          : 'Anmeldung fehlgeschlagen'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-3xl p-8 shadow-widget">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 mb-6 shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>

        <h1 className="text-3xl font-bold mb-2">Willkommen zurück</h1>
        <p className="text-ink-500 dark:text-ink-100 mb-6">
          Melde dich bei eurer Familie an
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Passwort"
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
            {loading ? 'Anmelden…' : 'Anmelden'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-500">
          Noch keinen Account?{' '}
          <Link
            href="/register"
            className="font-semibold text-ink-900 dark:text-white hover:underline"
          >
            Registrieren
          </Link>
        </div>
      </div>
    </div>
  );
}
