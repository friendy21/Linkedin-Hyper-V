// FILE: components/ui/ConfirmDialog.tsx
// Reusable confirmation dialog for destructive actions
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'secondary';
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const confirmStyles = {
    danger: {
      bg: 'bg-red-500 hover:bg-red-600',
      text: 'text-white',
    },
    primary: {
      bg: 'bg-[#0A66C2] hover:bg-[#004182]',
      text: 'text-white',
    },
    secondary: {
      bg: 'bg-slate-600 hover:bg-slate-700',
      text: 'text-white',
    },
  };

  const style = confirmStyles[confirmVariant];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <AnimatePresence>
          {open && (
            <>
              <DialogPrimitive.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50"
                  style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: 'spring', duration: 0.3 }}
                  className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-lg"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
                >
                  {/* Icon and Title */}
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ 
                        background: confirmVariant === 'danger' 
                          ? 'rgba(239, 68, 68, 0.1)' 
                          : 'rgba(59, 130, 246, 0.1)' 
                      }}
                    >
                      <AlertTriangle 
                        size={24} 
                        style={{ 
                          color: confirmVariant === 'danger' ? '#ef4444' : '#3b82f6' 
                        }} 
                      />
                    </div>
                    <div className="flex-1">
                      <DialogPrimitive.Title 
                        className="text-lg font-semibold" 
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {title}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description 
                        className="text-sm mt-1" 
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {description}
                      </DialogPrimitive.Description>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6 justify-end">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {cancelLabel}
                    </button>
                    <button
                      onClick={handleConfirm}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${style.bg} ${style.text}`}
                    >
                      {confirmLabel}
                    </button>
                  </div>

                  {/* Close button */}
                  <DialogPrimitive.Close asChild>
                    <button
                      className="absolute right-4 top-4 rounded-lg p-1.5 transition-all hover:bg-white/10"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={18} />
                    </button>
                  </DialogPrimitive.Close>
                </motion.div>
              </DialogPrimitive.Content>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
