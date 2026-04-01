import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  visible?: boolean;
}

export function Toast({ type = 'info', title, description, visible = true }: ToastProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={24} className="text-green-500" style={{ color: 'var(--color-success)' }} />;
      case 'error':
        return <XCircle size={24} className="text-red-500" style={{ color: 'var(--color-danger)' }} />;
      case 'warning':
        return <AlertCircle size={24} className="text-yellow-500" style={{ color: 'var(--color-warning)' }} />;
      case 'info':
      default:
        return <Info size={24} className="text-blue-500" style={{ color: 'var(--color-info)' }} />;
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl shadow-lg border w-80",
            "bg-white dark:bg-[#1e293b] dark:border-[#334155]"
          )}
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h4>
            {description && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
