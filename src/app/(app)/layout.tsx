'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AIAssistantFab } from '@/components/ai/ai-assistant-fab';
import { Sparkles } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!profile?.familyId) {
      router.replace('/onboarding');
      return;
    }
  }, [user, profile, loading, router]);

  // Still loading auth state — show full-screen spinner
  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-cream-100 dark:bg-ink-950">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-ink-200 dark:border-ink-700 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  // Not logged in or no family — redirecting (show nothing to avoid flash)
  if (!user || !profile?.familyId) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-cream-100 dark:bg-ink-950 pb-24">
      <main className="max-w-4xl mx-auto px-4 py-5">{children}</main>
      <AIAssistantFab />
      <BottomNav />
    </div>
  );
}
