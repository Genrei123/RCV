import React from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface AnimatedDivProps {
  children: React.ReactNode;
  animationClass: string;
  delay?: number;
  threshold?: number;
}

export function AnimatedDiv({
  children,
  animationClass,
  delay = 0,
  threshold = 0.1,
}: AnimatedDivProps) {
  const { ref, isVisible } = useIntersectionObserver({ threshold });

  return (
    <div
      ref={ref}
      className={isVisible ? animationClass : 'opacity-0'}
      style={{ animationDelay: isVisible ? `${delay}s` : '0s' }}
    >
      {children}
    </div>
  );
}
