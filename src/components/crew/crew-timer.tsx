'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Timer, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function CrewTimer() {
  const { user, activeTimer, setActiveTimer, tasks, setTasks } = useAppStore();
  const [elapsed, setElapsed] = useState('00:00:00');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopNote, setStopNote] = useState('');
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [todayEntries, setTodayEntries] = useState<any[]>([]);

  const myTasks = tasks.filter((t: any) =>
    t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
  );

  // Update elapsed time every second
  useEffect(() => {
    if (!activeTimer) {
      setElapsed('00:00:00');
      return;
    }
    const updateElapsed = () => {
      const start = new Date(activeTimer.startTime).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const fetchTimerAndData = useCallback(async () => {
    if (!user) return;
    try {
      const [timerRes, taskRes] = await Promise.all([
        fetch(`/api/timer?crewId=${user.id}`),
        fetch(`/api/tasks?crewId=${user.id}`),
      ]);
      const timerContentType = timerRes.headers.get('content-type') || '';
      const taskContentType = taskRes.headers.get('content-type') || '';
      if (!timerContentType.includes('application/json') || !taskContentType.includes('application/json')) {
        return;
      }
      const timerData = await timerRes.json();
      const taskData = await taskRes.json();

      // Timer API always returns { entries: [...] }
      const entries = Array.isArray(timerData)
        ? timerData
        : timerData?.entries || [];
      const active = entries.find((t: any) => !t.endTime) || null;

      setActiveTimer(active);
      setTasks(Array.isArray(taskData) ? taskData : taskData?.tasks || []);

      // Fetch today's entries
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const entryRes = await fetch(`/api/timer?crewId=${user.id}&from=${todayStart.toISOString()}`);
      const entryContentType = entryRes.headers.get('content-type') || '';
      if (!entryContentType.includes('application/json')) {
        return;
      }
      const entryData = await entryRes.json();
      const todayEntriesRaw = Array.isArray(entryData)
        ? entryData
        : entryData?.entries || [];
      const completedEntries = todayEntriesRaw.filter((e: any) => e.endTime);
      setTodayEntries(completedEntries);
    } catch {
      toast.error('Gagal memuat data timer');
    } finally {
      setLoading(false);
    }
  }, [user, setActiveTimer, setTasks]);

  useEffect(() => {
    fetchTimerAndData();
  }, [fetchTimerAndData]);

  const handleStart = async () => {
    if (!selectedTaskId) {
      toast.error('Pilih tugas terlebih dahulu');
      return;
    }
    const task = tasks.find((t: any) => t.id === selectedTaskId);
    if (!task) return;

    setStarting(true);
    try {
      const res = await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          crewId: user!.id,
          clientId: task.clientId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal memulai timer');
        return;
      }
      const data = await res.json();
      setActiveTimer(data.timeEntry || data);
      setSelectedTaskId('');
      toast.success('Timer dimulai!');
      fetchTimerAndData();
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setStarting(false);
    }
  };

  const handleStopClick = () => {
    setStopNote('');
    setStopDialogOpen(true);
  };

  const handleStop = async () => {
    if (!activeTimer) return;
    setStopping(true);
    try {
      const res = await fetch('/api/timer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: activeTimer.id,
          note: stopNote || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghentikan timer');
        return;
      }
      setActiveTimer(null);
      setStopDialogOpen(false);
      toast.success('Timer dihentikan');
      fetchTimerAndData();
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setStopping(false);
    }
  };

  const totalToday = todayEntries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className={`px-6 py-5 ${activeTimer ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'}`}>
          <div className="flex items-center gap-2">
            {activeTimer ? (
              <span className="h-2.5 w-2.5 bg-white rounded-full animate-pulse" />
            ) : (
              <Clock className="h-4 w-4 text-white/70" />
            )}
            <p className="text-white font-medium text-sm">
              {activeTimer ? 'Sedang Bekerja' : 'Timer Tidak Aktif'}
            </p>
          </div>
          {activeTimer && (
            <p className="text-white/80 text-sm mt-1 truncate">
              {activeTimer.task?.title} — {activeTimer.client?.name}
            </p>
          )}
        </div>
        <CardContent className="p-8 flex flex-col items-center gap-6">
          <p className={`text-6xl sm:text-7xl font-mono font-bold tracking-wider ${
            activeTimer ? 'text-emerald-600' : 'text-gray-300'
          }`}>
            {elapsed}
          </p>

          {!activeTimer ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih tugas..." />
                </SelectTrigger>
                <SelectContent>
                  {myTasks.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} ({t.client?.name || t.clientName || 'Tanpa klien'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleStart}
                disabled={starting || !selectedTaskId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto px-8"
                size="lg"
              >
                {starting ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Mulai
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStopClick}
              disabled={stopping}
              className="bg-rose-500 hover:bg-rose-600 text-white gap-2 px-8"
              size="lg"
            >
              {stopping ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              Berhenti
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Math.round(totalToday)} jam</p>
              <p className="text-xs text-muted-foreground">Total hari ini</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayEntries.length}</p>
              <p className="text-xs text-muted-foreground">Entri hari ini</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Log */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Log Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {todayEntries.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {todayEntries.map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.task?.title || 'Tanpa tugas'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.startTime && format(new Date(entry.startTime), 'HH:mm', { locale: localeId })}
                      {' — '}
                      {entry.endTime && format(new Date(entry.endTime), 'HH:mm', { locale: localeId })}
                      {entry.note && ` • ${entry.note}`}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                    {entry.duration ? `${Math.round(entry.duration * 60)} menit` : '-'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Timer className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada catatan hari ini</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stop Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hentikan Timer?</DialogTitle>
            <DialogDescription>
              Timer telah berjalan selama {elapsed}. Tambahkan catatan opsional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              placeholder="Apa yang sudah dikerjakan?"
              value={stopNote}
              onChange={(e) => setStopNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Batal</Button>
            <Button onClick={handleStop} disabled={stopping} className="bg-rose-500 hover:bg-rose-600 text-white">
              {stopping ? 'Menghentikan...' : 'Hentikan Timer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
