'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { SetupPage } from '@/components/auth/setup-page';
import { AuthPage } from '@/components/auth/auth-page';
import { AppLayout } from '@/components/layout/app-layout';

type AppView = 'loading' | 'setup' | 'auth' | 'app';

export function AppRouter() {
  const dbSetup = useAppStore((s) => s.dbSetup);
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);

  // Determine view once on mount, then track store changes
  const [view, setView] = useState<AppView>('loading');
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    // Use double-rAF to guarantee the loading frame is painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const { dbSetup: db, token: t, user: u } = useAppStore.getState();
        if (!db) setView('setup');
        else if (!t || !u) setView('auth');
        else setView('app');
      });
    });
  }, []);

  // After initialization, track store changes reactively
  useEffect(() => {
    if (view === 'loading') return;
    if (!dbSetup) { setView('setup'); return; }
    if (!token || !user) { setView('auth'); return; }
    setView('app');
  }, [view, dbSetup, token, user]);

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-blue-300/70">Memuat...</p>
        </div>
      </div>
    );
  }

  if (view === 'setup') return <SetupPage />;
  if (view === 'auth') return <AuthPage />;
  return <AppLayout />;
}
