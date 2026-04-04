// FILE: app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { WebSocketWithAuth } from '@/components/providers/WebSocketWithAuth';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'LinkedIn Hyper-V',
  description: 'Self-hosted LinkedIn automation dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body
        className="antialiased min-h-screen relative overflow-x-hidden font-sans"
        style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        {/* Ambient radial gradient */}
        <div
          className="fixed inset-0 pointer-events-none z-[-1]"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12), transparent)',
          }}
        />

        <AuthProvider>
          <WebSocketWithAuth>
            {children}
          </WebSocketWithAuth>
        </AuthProvider>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#0a0a0f' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0a0a0f' },
            },
          }}
        />
      </body>
    </html>
  );
}