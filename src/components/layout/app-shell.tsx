'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, ClipboardList, UserCog,
  BarChart3, Timer, LogOut, Menu, Clock, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import DashboardView from '@/components/dashboard/dashboard-view';
import DivisionManager from '@/components/admin/division-manager';
import ClientManager from '@/components/admin/client-manager';
import CrewManager from '@/components/admin/crew-manager';
import TaskManager from '@/components/tasks/task-manager';
import CrewTimer from '@/components/crew/crew-timer';
import ReportsView from '@/components/reports/reports-view';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['ADMIN', 'CAPTAIN', 'CREW'] },
  { id: 'divisions', label: 'Divisi', icon: <Building2 className="h-5 w-5" />, roles: ['ADMIN'] },
  { id: 'clients', label: 'Klien', icon: <Users className="h-5 w-5" />, roles: ['ADMIN', 'CAPTAIN'] },
  { id: 'tasks', label: 'Tugas', icon: <ClipboardList className="h-5 w-5" />, roles: ['ADMIN', 'CAPTAIN', 'CREW'] },
  { id: 'crew', label: 'Tim', icon: <UserCog className="h-5 w-5" />, roles: ['ADMIN', 'CAPTAIN'] },
  { id: 'reports', label: 'Laporan', icon: <BarChart3 className="h-5 w-5" />, roles: ['ADMIN', 'CAPTAIN'] },
  { id: 'timer', label: 'Timer', icon: <Timer className="h-5 w-5" />, roles: ['CREW'] },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { user, currentView, setCurrentView, activeTimer, logout } = useAppStore();
  const userRole = user?.role || '';

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  const handleNav = (view: string) => {
    setCurrentView(view);
    onNavigate?.();
  };

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-gray-900">CrewTracker</span>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={isActive ? 'text-emerald-600' : 'text-gray-400'}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.id === 'timer' && activeTimer && (
                <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 animate-pulse">
                  LIVE
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* User Info */}
      <div className="px-3 py-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full mt-3 text-gray-500 hover:text-rose-600 hover:bg-rose-50 justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AppShell() {
  const { currentView } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'divisions': return <DivisionManager />;
      case 'clients': return <ClientManager />;
      case 'tasks': return <TaskManager />;
      case 'crew': return <CrewManager />;
      case 'reports': return <ReportsView />;
      case 'timer': return <CrewTimer />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col border-r bg-white transition-all duration-300 relative">
        <div className={`${collapsed ? 'w-[68px]' : 'w-64'} h-full`}>
          <SidebarContent collapsed={collapsed} />
        </div>
        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-5 z-10 w-5 h-5 bg-white border rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all duration-300"
          style={{ left: collapsed ? '52px' : '236px' }}
        >
          <ChevronLeft className={`h-3 w-3 text-gray-500 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile Sidebar — single Sheet only */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Navigasi</SheetTitle>
          </SheetHeader>
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navItems.find((item) => item.id === currentView)?.label || 'Dashboard'}
            </h1>
          </div>
          <TopBarRight />
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function TopBarRight() {
  const { user, activeTimer, logout } = useAppStore();

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
  };

  return (
    <div className="flex items-center gap-3">
      {activeTimer && (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs px-2.5 py-1 gap-1.5">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          Timer Aktif
        </Badge>
      )}
      <div className="hidden sm:flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-semibold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-gray-700">{user?.name}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="text-gray-400 hover:text-rose-600"
        title="Keluar"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
