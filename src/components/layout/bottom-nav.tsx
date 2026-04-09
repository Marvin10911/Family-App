'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  CheckSquare,
  UtensilsCrossed,
  Calendar,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shopping', label: 'Einkauf', icon: ShoppingCart },
  { href: '/tasks', label: 'Aufgaben', icon: CheckSquare },
  { href: '/meals', label: 'Essen', icon: UtensilsCrossed },
  { href: '/calendar', label: 'Kalender', icon: Calendar },
  { href: '/admin', label: 'Einstell.', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-ink-100 dark:border-ink-700 pb-safe"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-around px-2 pt-2 pb-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all min-w-[52px]',
                active
                  ? 'text-ink-900 dark:text-white'
                  : 'text-ink-500'
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center w-6 h-6 transition-transform',
                  active && 'scale-110'
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span
                className={cn(
                  'text-[10px] leading-none',
                  active ? 'font-semibold' : 'font-medium'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
