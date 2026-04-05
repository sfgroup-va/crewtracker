'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Play, Square, ChevronDown, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function GlobalTimer() {
  const user = useAppStore((s) => s.user);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const setActiveTimer = useAppStore((s) => s.setActiveTimer);
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);

  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch projects and tasks (once on mount)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, taskRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/tasks'),
        ]);
        const projContentType = projRes.headers.get('content-type') || '';
        const taskContentType = taskRes.headers.get('content-type') || '';
        if (!projContentType.includes('application/json') || !taskContentType.includes('application/json')) {
          return;
        }
        const projJson = await projRes.json();
        const taskJson = await taskRes.json();
        if (projJson.projects) useAppStore.getState().setProjects(projJson.projects);
        if (taskJson.tasks) useAppStore.getState().setTasks(taskJson.tasks);
      } catch {
        // ignore
      }
    };
    fetchData();
  }, []);

  // Timer tick
  useEffect(() => {
    if (activeTimer) {
      const startTime = new Date(activeTimer.start_time).getTime();
      setElapsed(Math.floor((Date.now() - startTime) / 1000));

      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTimer]);

  // Pre-fill form when active timer exists (once on mount)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (activeTimer) {
      setDescription(activeTimer.description || '');
      if (activeTimer.project) setSelectedProject(activeTimer.project);
      if (activeTimer.task) setSelectedTask(activeTimer.task);
    }
  }, []);

  const handleStart = useCallback(async () => {
    if (!user?.id) return;

    if (!selectedProject) {
      toast.error('Pilih proyek terlebih dahulu');
      return;
    }

    const clientProject = projects.find((p: any) => p.id === selectedProject.id);
    const clientId = clientProject?.client_id;

    if (!clientId) {
      toast.error('Proyek tidak memiliki klien terkait');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crewId: user.id,
          clientId,
          projectId: selectedProject.id || null,
          taskId: selectedTask?.id || null,
          description: description || null,
        }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Gagal memulai timer');

      setActiveTimer(json.entry);
      toast.success('Timer dimulai');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memulai timer';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedProject, selectedTask, description, projects, setActiveTimer]);

  const handleStop = useCallback(async () => {
    if (!activeTimer?.id) return;

    setLoading(true);
    try {
      const res = await fetch('/api/timer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: activeTimer.id,
          description: description || activeTimer.description,
        }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Gagal menghentikan timer');

      setActiveTimer(null);
      setSelectedProject(null);
      setSelectedTask(null);
      setDescription('');
      toast.success('Timer dihentikan');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghentikan timer';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTimer, description, setActiveTimer]);

  const filteredTasks = selectedProject
    ? tasks.filter((t: any) => t.project_id === selectedProject.id)
    : tasks;

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-3 gap-2 shrink-0 sticky top-0 z-10">
      {/* Description input */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          placeholder="Apa yang sedang Anda kerjakan?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!!activeTimer}
          className="w-full h-full px-2 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none disabled:opacity-60"
        />
      </div>

      {/* Project selector */}
      <Popover open={projectOpen} onOpenChange={setProjectOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={!!activeTimer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm hover:bg-gray-100 transition-colors disabled:opacity-60 shrink-0"
          >
            {selectedProject ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedProject.color || '#3b82f6' }} />
                <span className="text-slate-700 max-w-[120px] truncate hidden sm:inline">{selectedProject.name}</span>
              </>
            ) : (
              <>
                <FolderIcon className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 hidden sm:inline">Proyek</span>
              </>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1" align="start">
          <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Proyek</div>
          <ScrollArea className="max-h-60">
            {projects.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-400 text-center">Tidak ada proyek</p>
            ) : (
              projects.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProject(p);
                    setProjectOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 transition-colors text-left',
                    selectedProject?.id === p.id && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || '#3b82f6' }} />
                  <span className="truncate">{p.name}</span>
                </button>
              ))
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Task selector */}
      <Popover open={taskOpen} onOpenChange={setTaskOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={!!activeTimer || !selectedProject}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm hover:bg-gray-100 transition-colors disabled:opacity-60 shrink-0"
          >
            {selectedTask ? (
              <span className="text-slate-700 max-w-[120px] truncate hidden sm:inline">{selectedTask.title}</span>
            ) : (
              <span className="text-slate-400 hidden sm:inline">Tugas</span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1" align="start">
          <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Tugas</div>
          <ScrollArea className="max-h-60">
            {filteredTasks.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-400 text-center">Tidak ada tugas</p>
            ) : (
              filteredTasks.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTask(t);
                    setTaskOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 transition-colors text-left',
                    selectedTask?.id === t.id && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <span className="truncate">{t.title}</span>
                </button>
              ))
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Start/Stop button */}
      {activeTimer ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-mono font-semibold text-slate-900 tabular-nums min-w-[80px] text-center">
            {formatElapsed(elapsed)}
          </span>
          <button
            onClick={handleStop}
            disabled={loading}
            className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-60"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-60 shrink-0"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>
      )}
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}
