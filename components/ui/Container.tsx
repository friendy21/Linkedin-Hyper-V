import React from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'lg' | 'xl' | '2xl' | 'full';
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, maxWidth = '2xl', className, ...props }, ref) => {
    const maxWidths = {
      lg: 'max-w-5xl',
      xl: 'max-w-7xl',
      '2xl': 'max-w-[1440px]',
      full: 'max-w-none',
    };

    return (
      <div ref={ref} className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', maxWidths[maxWidth], className)} {...props}>
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';
