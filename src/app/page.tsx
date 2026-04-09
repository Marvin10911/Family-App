'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!profile?.familyId) {
      router.replace('/onboarding');
    } else {
      router.replace('/dashboard');
    }
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream-100 dark:bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center animate-pulse shadow-lg">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div className="text-ink-500 text-sm">Lade Family App…</div>
      </div>
    </div>
  );
}
