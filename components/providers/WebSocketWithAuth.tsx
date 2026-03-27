// FILE: components/providers/WebSocketWithAuth.tsx
// Bridge: reads userId from the auth context and passes it to WebSocketProvider.
// This is a client component so it can use both contexts.
'use client';

import { useAuth } from './AuthProvider';
import { WebSocketProvider } from './WebSocketProvider';

export function WebSocketWithAuth({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  return <WebSocketProvider userId={userId}>{children}</WebSocketProvider>;
}
