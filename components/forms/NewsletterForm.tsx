'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface NewsletterFormProps {
    variant?: 'inline' | 'centered';
}

export const NewsletterForm: React.FC<NewsletterFormProps> = ({
    variant = 'inline',
}) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic email validation
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setStatus('error');
            setMessage('Please enter a valid email address');
            return;
        }

        setStatus('loading');

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setStatus('success');
                setMessage('Thank you for subscribing!');
                setEmail('');
                setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
            } else {
                const data = await res.json().catch(() => ({}));
                setStatus('error');
                setMessage(
                    res.status === 409
                        ? 'This email is already subscribed.'
                        : (data?.error ?? 'Something went wrong. Please try again.')
                );
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    if (variant === 'centered') {
        return (
            <div className="max-w-md mx-auto text-center">
                <h3 className="text-2xl font-heading text-navy mb-2">
                    Get Weekly Insights
                </h3>
                <p className="text-gray-600 mb-6">
                    Join 5,000+ wealth management professionals receiving our newsletter
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email address"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-silver focus:border-transparent"
                        disabled={status === 'loading'}
                    />
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
                    </Button>
                    {message && (
                        <p
                            className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'
                                }`}
                        >
                            {message}
                        </p>
                    )}
                </form>
                <p className="text-xs text-gray-500 mt-4">
                    We respect your privacy. Unsubscribe at any time.
                </p>
            </div>
        );
    }

    // Inline variant
    return (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-grow px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-silver focus:border-transparent"
                disabled={status === 'loading'}
            />
            <Button
                type="submit"
                variant="primary"
                disabled={status === 'loading'}
            >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </Button>
            {message && (
                <p
                    className={`text-sm sm:col-span-2 ${status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                >
                    {message}
                </p>
            )}
        </form>
    );
};