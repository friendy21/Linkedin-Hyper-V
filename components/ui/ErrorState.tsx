'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message, 
  onRetry 
}: ErrorStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl border"
      style={{ 
        background: 'var(--bg-panel)', 
        borderColor: 'var(--border)' 
      }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-danger-bg)' }}
      >
        <AlertTriangle size={32} style={{ color: 'var(--color-danger)' }} />
      </div>
      
      <div className="text-center">
        <h3 
          className="font-semibold text-lg mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p
          className="text-sm text-center max-w-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {message}
        </p>
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          style={{
            background: 'var(--accent)',
            color: '#fff',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              'var(--accent-hover)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              'var(--accent)')
          }
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}
