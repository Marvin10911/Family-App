'use client';

import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode, useRef, useState } from 'react';

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
  const ref = useRef<HTMLDivElement>(null);
  const [glare, setGlare] = useState({ x: 50, y: 50, visible: false });

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [10, -10]), { stiffness: 400, damping: 30 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-10, 10]), { stiffness: 400, damping: 30 });
  const scale = useSpring(1, { stiffness: 400, damping: 30 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
    setGlare({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      visible: true,
    });
    scale.set(1.03);
  }

  function onMouseLeave() {
    rawX.set(0);
    rawY.set(0);
    scale.set(1);
    setGlare((g) => ({ ...g, visible: false }));
  }

  const content = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: gradient,
        rotateX,
        rotateY,
        scale,
        transformPerspective: 900,
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'widget-base widget-bg-decor min-h-[180px] flex flex-col justify-between relative overflow-hidden cursor-pointer',
        size === 'wide' && 'col-span-2',
        className
      )}
    >
      {/* Glare / light reflection */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: glare.visible ? 1 : 0,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.18) 0%, transparent 65%)`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.18, type: 'spring', stiffness: 350, damping: 14 }}
            className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center"
          >
            <Icon className="w-[18px] h-[18px]" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.24, duration: 0.3 }}
            className="font-semibold text-[15px]"
          >
            {title}
          </motion.span>
        </div>
        {headerRight}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.3, duration: 0.35 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </motion.div>
  );

  if (href) return <Link href={href} className="block">{content}</Link>;
  return content;
}
