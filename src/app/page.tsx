'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';

// Lazy load views — only loads what's needed
const AuthPage = dynamic(
  () => import('@/components/auth/auth-page').then(m => ({ default: m.AuthPage })),
  { ssr: false }
);
const AppLayout = dynamic(
  () => import('@/components/layout/app-layout').then(m => ({ default: m.AppLayout })),
  { ssr: false }
);

type Screen = 'loading' | 'auth' | 'app';

export default function Page() {
  const [screen, setScreen] = useState<Screen>('loading');
  const initialized = useRef(false);

  // ONE-TIME check: read persisted auth state, set screen, done. No API calls.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const { token, user } = useAppStore.getState();
    setScreen(token && user ? 'app' : 'auth');
  }, []);

  // React to login/logout from other components
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      const now = !!state.token && !!state.user;
      const was = !!prev.token && !!prev.user;
      if (now && !was) setScreen('app');
      else if (!now && was) setScreen('auth');
    });
    return unsub;
  }, []);

  if (screen === 'auth') return <AuthPage />;
  if (screen === 'app') return <AppLayout />;

  // Minimal loading — shown for < 50ms while Zustand hydrates from localStorage
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
