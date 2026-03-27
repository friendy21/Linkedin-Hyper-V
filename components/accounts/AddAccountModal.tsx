'use client';

// FILE: components/accounts/AddAccountModal.tsx
// Redesigned: no cookie paste. Single button that calls POST /api/linkedin-accounts/connect
// which triggers a real Playwright login window on the server.

import { useState } from 'react';
import { X, Linkedin, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingAccounts?: string[];
}

type Step = 'idle' | 'connecting' | 'waiting' | 'success' | 'error';

export function AddAccountModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleConnect = async () => {
    setStep('connecting');
    setError(null);

    try {
      // Give a moment before showing the "waiting" state so the user understands
      setTimeout(() => setStep('waiting'), 800);

      const res = await fetch('/api/linkedin-accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Connection failed');
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setStep('error');
    }
  };

  const handleClose = () => {
    if (step === 'connecting' || step === 'waiting') return; // don't close during active session
    setStep('idle');
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)' }}
      >
        {/* Close button */}
        {step !== 'connecting' && step !== 'waiting' && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        )}

        {/* ── Idle: prompt user ────────────────────────────────── */}
        {(step === 'idle' || step === 'error') && (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: '#0A66C2' }}
            >
              <Linkedin size={32} color="white" />
            </div>

            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Connect LinkedIn Account
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              A real LinkedIn login window will open on the server. Log in with your LinkedIn
              credentials there — we never see or touch them.
            </p>

            {error && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl mb-6 text-left"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}

            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-6 text-left"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <ExternalLink size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  How it works
                </p>
                <ol className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                  <li>1. Click the button below</li>
                  <li>2. A LinkedIn login window opens automatically</li>
                  <li>3. Log in with your LinkedIn credentials</li>
                  <li>4. Your account is connected automatically on success</li>
                </ol>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: '#0A66C2' }}
            >
              <Linkedin size={20} />
              {error ? 'Try Again' : 'Connect LinkedIn Account'}
            </button>
          </div>
        )}

        {/* ── Connecting: dispatching job ──────────────────────── */}
        {step === 'connecting' && (
          <div className="text-center py-4">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: '#0A66C2' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Starting up…
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Launching the LinkedIn login window
            </p>
          </div>
        )}

        {/* ── Waiting: LinkedIn window is open ────────────────── */}
        {step === 'waiting' && (
          <div className="text-center py-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
              style={{ background: '#0A66C2' }}
            >
              <Linkedin size={32} color="white" />
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full animate-ping"
                style={{ background: '#22c55e' }}
              />
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full"
                style={{ background: '#22c55e' }}
              />
            </div>

            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              LinkedIn window is open
            </h3>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              Log in with your LinkedIn credentials in the browser window that just opened.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              This window will close automatically after you log in. You have up to 5 minutes.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Waiting for login…
              </span>
            </div>
          </div>
        )}

        {/* ── Success ──────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34,197,94,0.1)' }}
            >
              <CheckCircle2 size={40} style={{ color: '#22c55e' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Account Connected!
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Your LinkedIn account has been connected successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
