'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
}

export function AnimatedNumber({ value, className, duration = 0.8, delay = 0.3 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        el.textContent = Math.round(v).toString();
      },
    });
    return controls.stop;
  }, [value, duration, delay]);

  return <span ref={ref} className={className}>0</span>;
}
