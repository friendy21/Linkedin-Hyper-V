// FILE: components/accounts/AddAccountModal.tsx
'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft } from 'lucide-react';
import { Button, Spinner } from '@/components/ui/Button';
import { CookieInstructions } from './CookieInstructions';
import { toast } from '@/components/ui/Toast';

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PROXY_REGEX = /^https?:\/\/[^:]+:[^@]+@[^:]+:\d+$/;

type StepState = {
  name: string;
  proxyUrl: string;
  cookieJson: string;
};

type VerifyResult =
  | { ok: true; accountId: string }
  | { ok: false; error: string };

export function AddAccountModal({ open, onOpenChange, onSuccess }: AddAccountModalProps) {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<StepState>({ name: '', proxyUrl: '', cookieJson: '' });
  const [errors, setErrors] = useState<Partial<StepState>>({});
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const resetModal = () => {
    setStep(0);
    setFields({ name: '', proxyUrl: '', cookieJson: '' });
    setErrors({});
    setVerifyResult(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetModal();
    onOpenChange(v);
  };

  const validateStep0 = () => {
    const errs: Partial<StepState> = {};
    if (!fields.name.trim()) errs.name = 'Display name is required';
    if (fields.proxyUrl && !PROXY_REGEX.test(fields.proxyUrl)) {
      errs.proxyUrl = 'Must be http(s)://user:pass@host:port';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    try {
      const parsed: unknown = JSON.parse(fields.cookieJson);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setErrors({ cookieJson: 'Must be a non-empty JSON array of cookie objects' });
        return false;
      }
      setErrors({});
      return true;
    } catch {
      setErrors({ cookieJson: 'Invalid JSON — paste the cookie array exactly' });
      return false;
    }
  };

  const handleVerifyAndSave = async () => {
    if (!validateStep2()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: fields.name,
          proxyUrl: fields.proxyUrl || null,
          cookies: JSON.parse(fields.cookieJson),
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = typeof data === 'object' && data !== null && 'error' in data
          ? String((data as Record<string, unknown>).error)
          : 'Failed to save account';
        setVerifyResult({ ok: false, error: msg });
      } else {
        const accountId = typeof data === 'object' && data !== null && 'id' in data
          ? String((data as Record<string, unknown>).id)
          : '';
        setVerifyResult({ ok: true, accountId });
        toast.success('Account added successfully!');
        onSuccess?.();
        setTimeout(() => handleOpenChange(false), 1200);
      }
    } catch {
      setVerifyResult({ ok: false, error: 'Network error — please try again' });
    } finally {
      setVerifying(false);
    }
  };

  const inputBase = `
    w-full px-3 py-2.5 rounded-xl text-sm text-[--text-primary] placeholder:text-[--text-muted]
    bg-[--bg-elevated] border transition-colors outline-none focus:border-[--accent]
  `;

  const steps = ['Details', 'Instructions', 'Cookies'];

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-2xl p-6 shadow-2xl focus:outline-none"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Dialog.Title className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Add LinkedIn Account
              </Dialog.Title>
              <Dialog.Description className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Step {step + 1} of {steps.length}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Step dots */}
          <div className="flex gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ backgroundColor: i <= step ? 'var(--accent)' : 'var(--border-strong)' }}
              />
            ))}
          </div>

          {/* Step 0: Details */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label-xs block mb-1.5">Display Name</label>
                <input
                  id="account-name"
                  type="text"
                  value={fields.name}
                  onChange={(e) => setFields(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Smith (Sales)"
                  className={inputBase}
                  style={{ borderColor: errors.name ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)' }}
                />
                {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.name}</p>}
              </div>
              <div>
                <label className="label-xs block mb-1.5">Proxy URL <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                <input
                  id="account-proxy"
                  type="text"
                  value={fields.proxyUrl}
                  onChange={(e) => setFields(f => ({ ...f, proxyUrl: e.target.value }))}
                  placeholder="http://user:pass@host:port"
                  className={inputBase}
                  style={{ borderColor: errors.proxyUrl ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)' }}
                />
                {errors.proxyUrl && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.proxyUrl}</p>}
              </div>
            </div>
          )}

          {/* Step 1: Cookie instructions */}
          {step === 1 && (
            <div className="max-h-80 overflow-y-auto pr-1">
              <CookieInstructions />
            </div>
          )}

          {/* Step 2: Paste cookies */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="label-xs block mb-1.5">Cookie JSON</label>
                <textarea
                  id="account-cookies"
                  rows={7}
                  value={fields.cookieJson}
                  onChange={(e) => setFields(f => ({ ...f, cookieJson: e.target.value }))}
                  placeholder='[{"name":"li_at","value":"AQE...","domain":".linkedin.com",...}]'
                  className={`${inputBase} resize-none font-mono text-xs`}
                  style={{ borderColor: errors.cookieJson ? 'rgba(239,68,68,0.5)' : 'var(--border-strong)' }}
                />
                {errors.cookieJson && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.cookieJson}</p>}
              </div>
              {verifyResult && (
                <div
                  className="px-3 py-2.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: verifyResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${verifyResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: verifyResult.ok ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {verifyResult.ok ? `✓ Account saved successfully` : `✗ ${verifyResult.error}`}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 mt-6">
            {step > 0 && (
              <Button variant="ghost" size="md" leftIcon={<ChevronLeft size={15} />} onClick={() => setStep(s => s - 1)}>
                Back
              </Button>
            )}
            <div className="flex-1" />
            {step < 2 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (step === 0 && !validateStep0()) return;
                  setStep(s => s + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                loading={verifying}
                onClick={handleVerifyAndSave}
              >
                Verify & Save
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
