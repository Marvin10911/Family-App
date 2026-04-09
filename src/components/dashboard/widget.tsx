'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface WidgetProps {
  href?: string;
  icon: LucideIcon;
  title: string;
  gradient: string;
  children: ReactNode;
  className?: string;
  size?: 'default' | 'wide';
  delay?: number;
  headerRight?: ReactNode;
}

export function Widget({
  href,
  icon: Icon,
  title,
  gradient,
  children,
  className,
  size = 'default',
  delay = 0,
  headerRight,
}: WidgetProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'widget-base widget-bg-decor min-h-[180px] flex flex-col justify-between',
        size === 'wide' && 'col-span-2',
        className
      )}
      style={{ background: gradient }}
    >
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="w-[18px] h-[18px]" />
          </div>
          <span className="font-semibold text-[15px]">{title}</span>
        </div>
        {headerRight}
      </div>
      <div className="relative z-10">{children}</div>
    </motion.div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
