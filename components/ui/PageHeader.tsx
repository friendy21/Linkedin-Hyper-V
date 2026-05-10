import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, meta, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 border-b border-[var(--border)] bg-[var(--bg-panel)] px-4 py-4 sm:px-6 lg:px-8', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {meta && <div>{meta}</div>}
    </div>
  );
}
