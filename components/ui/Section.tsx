import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  tone?: 'default' | 'panel' | 'subtle';
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ children, tone = 'default', className, ...props }, ref) => {
    const tones = {
      default: 'bg-transparent',
      panel: 'bg-[var(--bg-panel)]',
      subtle: 'bg-[var(--bg-subtle)]',
    };

    return (
      <section ref={ref} className={cn('py-6', tones[tone], className)} {...props}>
        {children}
      </section>
    );
  }
);

Section.displayName = 'Section';
