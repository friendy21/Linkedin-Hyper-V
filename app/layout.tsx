import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { WebSocketWithAuth } from "@/components/providers/WebSocketWithAuth";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "LinkedIn Hyper-V",
  description: "Self-hosted LinkedIn automation dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body
        className="antialiased min-h-screen relative overflow-x-hidden text-slate-50 selection:bg-indigo-500/30 font-sans"
        style={{ backgroundColor: '#020617' }} // Base slate-950
      >
        {/* Subtle radial gradient background effect for glassmorphism pop */}
        <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
        
        <AuthProvider>
          <WebSocketWithAuth>
            {children}
          </WebSocketWithAuth>
        </AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            className: '!bg-slate-800/90 !backdrop-blur-md !text-slate-50 !border !border-slate-700 !shadow-2xl !shadow-indigo-500/10',
          }}
        />
      </body>
    </html>
  );
}