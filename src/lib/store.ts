'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Auth
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;

  // Navigation
  currentView: string;
  setCurrentView: (view: string) => void;

  // Database setup (NOT persisted — always starts false, checked via API)
  dbSetup: boolean;
  setDbSetup: (v: boolean) => void;

  // Data cache
  divisions: any[];
  setDivisions: (data: any[]) => void;
  clients: any[];
  setClients: (data: any[]) => void;
  projects: any[];
  setProjects: (data: any[]) => void;
  tasks: any[];
  setTasks: (data: any[]) => void;
  users: any[];
  setUsers: (data: any[]) => void;
  dashboardData: any;
  setDashboardData: (data: any) => void;

  // Timer
  activeTimer: any | null;
  setActiveTimer: (timer: any | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user, currentView: 'timer' }),
      logout: () => set({
        token: null,
        user: null,
        currentView: 'timer',
        activeTimer: null,
        dashboardData: null,
      }),

      // Navigation
      currentView: 'timer',
      setCurrentView: (view) => set({ currentView: view }),

      // Database setup (NOT persisted — checked via API on every load)
      dbSetup: false,
      setDbSetup: (v) => set({ dbSetup: v }),

      // Data cache
      divisions: [],
      setDivisions: (data) => set({ divisions: data }),
      clients: [],
      setClients: (data) => set({ clients: data }),
      projects: [],
      setProjects: (data) => set({ projects: data }),
      tasks: [],
      setTasks: (data) => set({ tasks: data }),
      users: [],
      setUsers: (data) => set({ users: data }),
      dashboardData: null,
      setDashboardData: (data) => set({ dashboardData: data }),

      // Timer
      activeTimer: null,
      setActiveTimer: (timer) => set({ activeTimer: timer }),
    }),
    {
      name: 'crewtracker-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        currentView: state.currentView,
        // dbSetup, divisions, clients, projects, tasks, users, dashboardData, activeTimer are NOT persisted
      }),
    }
  )
);
