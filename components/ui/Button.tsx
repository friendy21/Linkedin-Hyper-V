import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, isLoading, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden';

    // Modern professional variants (Slate & Indigo based)
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] focus:ring-indigo-500 ring-offset-slate-900 border border-indigo-500/50',
      secondary:
        'bg-slate-800 text-slate-100 hover:bg-slate-700 shadow-md focus:ring-slate-500 ring-offset-slate-900 border border-slate-700',
      accent:
        'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 focus:ring-violet-500 border border-violet-500/50',
      danger:
        'bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-600/30 focus:ring-rose-500',
      ghost:
        'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 focus:ring-slate-500',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...(props as any)}
      >
        {/* Subtle shine effect wrapper */}
        <span className="absolute inset-0 w-full h-full gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        
        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : null}
          {children}
        </span>
      </motion.button>
    );
  }
);
Button.displayName = 'Button';