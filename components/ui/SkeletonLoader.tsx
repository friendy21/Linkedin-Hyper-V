// FILE: components/ui/SkeletonLoader.tsx
import { cn } from '@/lib/utils';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

const shimmerStyle: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--bg-elevated) 25%, rgba(255,255,255,0.06) 50%, var(--bg-elevated) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.6s ease-in-out infinite',
};

export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <div
      className={cn('rounded-lg', className)}
      style={{
        ...shimmerStyle,
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : '100%',
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : 16,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} className="rounded-xl" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton height={14} width="50%" />
          <Skeleton height={11} width="30%" />
        </div>
      </div>
      <Skeleton height={28} width="40%" />
      <Skeleton height={10} width="65%" />
    </div>
  );
}

/** Backward-compat multi-variant Skeleton for existing call sites */
interface LegacySkeletonProps {
  variant?: 'card' | 'pill' | 'row' | 'text' | 'avatar';
  count?: number;
  className?: string;
}

export function SkeletonLegacy({ variant = 'text', count = 1, className }: LegacySkeletonProps) {
  const variantMap: Record<string, { height: number | string; className?: string }> = {
    card:   { height: 128, className: 'rounded-xl' },
    pill:   { height: 40,  className: 'rounded-full w-24' },
    row:    { height: 64,  className: 'rounded-lg' },
    text:   { height: 16,  className: '' },
    avatar: { height: 40,  className: 'rounded-full w-10' },
  };

  const cfg = variantMap[variant];

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          height={cfg.height}
          className={cn(cfg.className, className)}
        />
      ))}
    </>
  );
}

// ── Conversation / Message skeletons (kept for existing imports) ────────────
export function ConversationSkeleton() {
  return (
    <div className="flex gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
      <Skeleton width={44} height={44} className="rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2 justify-center">
        <Skeleton height={13} width="40%" />
        <Skeleton height={11} width="75%" />
      </div>
      <Skeleton height={11} width={40} className="mt-1 flex-shrink-0" />
    </div>
  );
}

export function ConversationListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => <ConversationSkeleton key={i} />)}
    </>
  );
}

export function MessageSkeleton({ isSentByMe = false }: { isSentByMe?: boolean }) {
  return (
    <div className={`flex gap-3 mb-4 ${isSentByMe ? 'flex-row-reverse' : ''}`}>
      {!isSentByMe && <Skeleton width={32} height={32} className="rounded-full flex-shrink-0" />}
      <Skeleton height={60} width="60%" className="rounded-2xl" />
    </div>
  );
}

export function MessageThreadSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <MessageSkeleton isSentByMe={false} />
      <MessageSkeleton isSentByMe />
      <MessageSkeleton isSentByMe={false} />
      <MessageSkeleton isSentByMe />
      <MessageSkeleton isSentByMe={false} />
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function ActivityListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <Skeleton width={10} height={10} className="rounded-full flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton height={13} width="33%" />
            <Skeleton height={11} width="60%" />
          </div>
          <Skeleton height={11} width={48} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
