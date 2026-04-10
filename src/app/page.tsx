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
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-cream-100 dark:bg-ink-950">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <div className="w-8 h-8 rounded-full border-2 border-ink-200 dark:border-ink-700 border-t-violet-500 animate-spin" />
    </div>
  );
}
