'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AIAssistantFab } from '@/components/ai/ai-assistant-fab';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!profile?.familyId) router.replace('/onboarding');
  }, [user, profile, loading, router]);

  if (loading || !user || !profile?.familyId) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream-100 dark:bg-ink-950">
        <div className="w-10 h-10 rounded-full border-2 border-ink-200 border-t-ink-900 dark:border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream-100 dark:bg-ink-950 pb-24">
      <main className="max-w-4xl mx-auto p-5">{children}</main>
      <AIAssistantFab />
      <BottomNav />
    </div>
  );
}
