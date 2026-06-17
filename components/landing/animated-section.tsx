'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type AnimationFrom = 'bottom' | 'top' | 'left' | 'right';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Delay before the transition starts, in ms. Used for staggered card grids. */
  delay?: number;
  /** Direction the element slides in from. Defaults to 'bottom'. */
  from?: AnimationFrom;
}

const HIDDEN_TRANSFORM: Record<AnimationFrom, string> = {
  bottom: 'translate-y-8',
  top: '-translate-y-8',
  left: '-translate-x-8',
  right: 'translate-x-8',
};

export function AnimatedSection({
  children,
  className,
  delay = 0,
  from = 'bottom',
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        // Base transition (ignored when prefers-reduced-motion is set)
        'transition-all duration-700 ease-out',
        // Reduced-motion override: always visible, no transform, no transition
        'motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:translate-x-0 motion-reduce:transition-none',
        // Animated state
        visible
          ? 'opacity-100 translate-y-0 translate-x-0'
          : `opacity-0 ${HIDDEN_TRANSFORM[from]}`,
        className
      )}
    >
      {children}
    </div>
  );
}
