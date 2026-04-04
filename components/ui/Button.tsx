// FILE: components/ui/Button.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  /** @deprecated use loading */
  isLoading?: boolean;
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      isLoading,
      leftIcon,
      rightIcon,
      fullWidth,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading || isLoading;
    const showSpinner = loading || isLoading;

    const base =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[--accent] text-white hover:bg-[--accent-hover] focus-visible:ring-[--accent] focus-visible:ring-offset-[--bg-base] shadow-sm shadow-[--accent-glow]',
      secondary:
        'bg-[--bg-elevated] text-[--text-primary] hover:bg-white/[0.08] border border-[--border-strong] focus-visible:ring-[--accent] focus-visible:ring-offset-[--bg-base]',
      ghost:
        'bg-transparent text-[--text-secondary] hover:text-white hover:bg-white/[0.06] focus-visible:ring-[--accent] focus-visible:ring-offset-[--bg-base]',
      danger:
        'bg-[rgba(239,68,68,0.1)] text-[--danger] hover:bg-[rgba(239,68,68,0.2)] border border-[rgba(239,68,68,0.3)] focus-visible:ring-red-500 focus-visible:ring-offset-[--bg-base]',
      outline:
        'bg-transparent border border-[--border-strong] text-[--text-secondary] hover:border-[--accent] hover:text-white focus-visible:ring-[--accent] focus-visible:ring-offset-[--bg-base]',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          className
        )}
        {...props}
      >
        {showSpinner ? (
          <Spinner size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {!showSpinner && children}
        {!showSpinner && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Spinner };