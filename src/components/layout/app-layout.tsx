'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
// pathname not used — removed unused import
import dynamic from 'next/dynamic';
import {
  Clock, LayoutDashboard, FolderOpen, Users, ClipboardList,
  BarChart3, Settings, LogOut, Menu, X, ChevronLeft, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { GlobalTimer } from '@/components/timer/global-timer';
import { toast } from 'sonner';

// Lazy load all page components to reduce initial bundle size
const DashboardPage = dynamic(
  () => import('@/components/dashboard/dashboard-page').then(m => ({ default: m.DashboardPage })),
  { loading: () => <div className="p-8 text-center text-slate-400">Memuat...</div> }
);
const ProjectsPage = dynamic(
  () => import('@/components/projects/projects-page').then(m => ({ default: m.ProjectsPage })),
  { loading: () => <div className="p-8 text-center text-slate-400">Memuat...</div> }
);
const TasksPage = dynamic(
  () => import('@/components/tasks/tasks-page').then(m => ({ default: m.TasksPage })),
  { loading: () => <div className="p-8 text-center text-slate-400">Memuat...</div> }
);
const TeamPage = dynamic(
  () => import('@/components/team/team-page').then(m => ({ default: m.TeamPage })),
  { loading: () => <div className="p-8 text-center text-slate-400">Memuat...</div> }
);
const ClientsPage = dynamic(
  () => import('@/components/clients/clients-page').then(m => ({ default: m.ClientsPage })),
  { loading: () => <div className="p-8 text-center text-slate-400">Memuat...</div> }
);
const ReportsPage = dynamic(
  () => import('@/components/reports/reports-page').then(m => ({ default: m.ReportsPage })),
  { loading: () => <div className="p-8 text-center text-slate-400">Memuat...</div> }
);
const DivisionsPage = dynamic(
  () => import('@/components/divisions/divisions-page').then(m => ({ default: m.DivisionsPage })),
  { loading: () => <div className="p-8 text-center text-slate-400">Memuat...</div> }
);

const NAV_ITEMS = [
  { id: 'timer', label: 'Timer', icon: Clock, roles: ['ADMIN', 'CAPTAIN', 'CREW'] },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CAPTAIN', 'CREW'] },
  { id: 'projects', label: 'Proyek', icon: FolderOpen, roles: ['ADMIN', 'CAPTAIN'] },
  { id: 'tasks', label: 'Tugas', icon: ClipboardList, roles: ['ADMIN', 'CAPTAIN', 'CREW'] },
  { id: 'team', label: 'Tim', icon: Users, roles: ['ADMIN', 'CAPTAIN'] },
  { id: 'clients', label: 'Klien', icon: Users, roles: ['ADMIN', 'CAPTAIN'] },
  { id: 'reports', label: 'Laporan', icon: BarChart3, roles: ['ADMIN', 'CAPTAIN'] },
  { id: 'divisions', label: 'Divisi', icon: Settings, roles: ['ADMIN'] },
];

function SidebarNav({ collapsed, onNavigate, onClose }: { collapsed: boolean; onNavigate?: () => void; onClose?: () => void }) {
  const currentView = useAppStore((s) => s.currentView);
  const user = useAppStore((s) => s.user);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const userRole = user?.role || 'CREW';

  const handleNav = (viewId: string) => {
    setCurrentView(viewId);
    onClose?.();
  };

  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-white tracking-tight">CrewTracker</span>
        )}
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Nav Items */}
      <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-slate-700/80 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-blue-400')} />
              {!collapsed && <span>{item.label}</span>}
              {item.id === 'timer' && activeTimer && !collapsed && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Timer Indicator */}
      {activeTimer && !collapsed && (
        <div className="mx-2 mb-2 px-3 py-2.5 bg-emerald-900/30 border border-emerald-700/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-300">Timer aktif</span>
          </div>
        </div>
      )}

      <Separator className="bg-slate-700/50" />

      {/* User section */}
      <div className="p-3 shrink-0">
        <div className={cn(
          'flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50',
          collapsed && 'justify-center px-0'
        )}>
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.role}</p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export function AppLayout() {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const currentView = useAppStore((s) => s.currentView);
  const logout = useAppStore((s) => s.logout);
  const setActiveTimer = useAppStore((s) => s.setActiveTimer);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // NOTE: Token validation removed — login already validates credentials.
  // Server has memory constraints and may temporarily return non-JSON on OOM restart,
  // which would falsely trigger logout. Trust the persisted session instead.

  // Fetch active timer on mount and every 30s
  useEffect(() => {
    const fetchActiveTimer = async () => {
      const currentUser = useAppStore.getState().user;
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`/api/timer?crewId=${currentUser.id}&active=true`);
        const timerContentType = res.headers.get('content-type') || '';
        if (!timerContentType.includes('application/json')) {
          return;
        }
        const json = await res.json();
        if (json.activeTimer) {
          useAppStore.getState().setActiveTimer(json.activeTimer);
        } else {
          useAppStore.getState().setActiveTimer(null);
        }
      } catch {
        // ignore
      }
    };
    fetchActiveTimer();
    const interval = setInterval(fetchActiveTimer, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'tasks':
        return <TasksPage />;
      case 'team':
        return <TeamPage />;
      case 'clients':
        return <ClientsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'divisions':
        return <DivisionsPage />;
      case 'timer':
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-slate-900 transition-all duration-300 shrink-0',
          sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        <SidebarNav collapsed={sidebarCollapsed} />
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-5 z-50 hidden lg:flex items-center justify-center w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-400 transition-colors"
          style={{ left: sidebarCollapsed ? '52px' : '224px' }}
        >
          <ChevronLeft className={cn('w-3.5 h-3.5 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-slate-900 border-slate-700">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <SidebarNav collapsed={false} onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 bg-slate-900 border-b border-slate-700/50 flex items-center px-4 shrink-0 gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-300 hover:text-white p-1"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <div className="w-full h-9 bg-slate-800 rounded-lg flex items-center px-3 gap-2 cursor-pointer hover:bg-slate-700 transition-colors">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm text-slate-400">Cari...</span>
                <kbd className="hidden sm:inline-flex ml-auto items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-700 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative text-slate-400 hover:text-white p-1.5 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
            </button>

            <Separator orientation="vertical" className="h-6 bg-slate-700 mx-1" />

            {/* User info */}
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-blue-600 text-white text-[10px] font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{user?.role}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Timer Bar */}
        <GlobalTimer />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
