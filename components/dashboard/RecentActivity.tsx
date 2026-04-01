// FILE: components/dashboard/RecentActivity.tsx
'use client';

import { useState } from 'react';
import { MessageSquare, UserPlus, Eye, ExternalLink, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityEntry } from '@/types/dashboard';

interface RecentActivityProps {
  activities: ActivityEntry[];
}

// Generate a stable key for activity items
const getActivityKey = (activity: ActivityEntry, index: number): string => {
  // Use composite key if possible, fallback to index with type/timestamp
  return `${activity.accountId}-${activity.timestamp}-${activity.type}-${index}`;
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const [displayCount, setDisplayCount] = useState(10);
  
  const getIcon = (type: ActivityEntry['type']) => {
    switch (type) {
      case 'messageSent':
        return { Icon: MessageSquare, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' }; // Blue
      case 'connectionSent':
        return { Icon: UserPlus, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' }; // Green
      case 'profileViewed':
        return { Icon: Eye, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' }; // Amber
      default:
        return { Icon: MessageSquare, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' };
    }
  };

  const getTypeLabel = (type: ActivityEntry['type']) => {
    switch (type) {
      case 'messageSent':
        return 'Message Sent';
      case 'connectionSent':
        return 'Connection Request';
      case 'profileViewed':
        return 'Profile Viewed';
      default:
        return 'Activity';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayedActivities = activities.slice(0, displayCount);
  const hasMore = activities.length > displayCount;

  if (activities.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Empty state illustration */}
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-card)' }}
          >
            <Search size={32} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              No activity yet
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Add a LinkedIn account to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Recent Activity
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {activities.length} total
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        <AnimatePresence>
          {displayedActivities.map((activity, index) => {
            const { Icon, color, bgColor } = getIcon(activity.type);
            const activityKey = getActivityKey(activity, index);
            
            return (
              <motion.div
                key={activityKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-default group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: bgColor }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {getTypeLabel(activity.type)}
                    </span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded max-w-[150px] truncate" 
                      style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
                      title={activity.accountId}
                    >
                      {activity.accountId.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                      {activity.targetName}
                    </p>
                    {activity.targetProfileUrl && (
                      <a
                        href={activity.targetProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {activity.message && (
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      {activity.message}
                    </p>
                  )}
                </div>
                <div 
                  className="text-xs flex-shrink-0" 
                  style={{ color: 'var(--text-muted)' }}
                  title={formatFullTimestamp(activity.timestamp)}
                >
                  {formatTimestamp(activity.timestamp)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setDisplayCount(prev => prev + 10)}
            className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5 flex items-center justify-center gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronDown size={16} />
            Load more ({activities.length - displayCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
