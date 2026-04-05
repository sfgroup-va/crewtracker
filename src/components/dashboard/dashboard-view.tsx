'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Clock, TrendingUp, Timer, CheckCircle2, Play,
  AlertCircle, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function DashboardView() {
  const { user, dashboardData, setDashboardData } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: user.role,
        userId: user.id,
      });
      if (user.divisionId) params.set('divisionId', user.divisionId);
      const res = await fetch(`/api/dashboard?${params}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        toast.error('Server error: respons bukan JSON');
        return;
      }
      const data = await res.json();
      setDashboardData(data);
    } catch {
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Tidak ada data yang tersedia</p>
      </div>
    );
  }

  if (user?.role === 'CREW') {
    return <CrewDashboard data={dashboardData} />;
  }

  if (user?.role === 'CAPTAIN') {
    return <CaptainDashboard data={dashboardData} />;
  }

  return <AdminDashboard data={dashboardData} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-60 rounded-xl" />
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AdminDashboard({ data }: { data: any }) {
  const chartData = (data.clientHours || []).map((c: any) => ({
    name: c.name?.length > 10 ? c.name.substring(0, 10) + '...' : c.name,
    Dialokasikan: c.monthlyHours,
    Digunakan: Math.round(c.hoursThisMonth || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Klien"
          value={data.totalClients || 0}
          subtitle={`${data.activeClients || 0} aktif`}
          icon={<Users className="h-5 w-5 text-white" />}
          color="bg-emerald-500"
        />
        <StatCard
          title="Total Crew"
          value={data.totalCrew || 0}
          subtitle="Anggota tim"
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          color="bg-teal-500"
        />
        <StatCard
          title="Jam Bulan Ini"
          value={`${Math.round(data.totalHoursThisMonth || 0)} jam`}
          subtitle="Total tercatat"
          icon={<Clock className="h-5 w-5 text-white" />}
          color="bg-amber-500"
        />
        <StatCard
          title="Utilisasi"
          value={`${Math.round(data.avgUtilization || 0)}%`}
          subtitle="Rata-rata klien"
          icon={<BarChart3 className="h-5 w-5 text-white" />}
          color="bg-rose-500"
        />
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Jam Kerja per Klien</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Dialokasikan" fill="#d1fae5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Digunakan" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Belum ada data jam kerja
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Timers & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Timers */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-500" />
              Timer Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.activeTimers && data.activeTimers.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {data.activeTimers.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {t.crew?.name || 'Crew'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.task?.title} — {t.client?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada timer aktif</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
              Tugas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTasks && data.recentTasks.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {data.recentTasks.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <StatusBadge status={t.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.client?.name} {t.crew ? `• ${t.crew.name}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada tugas</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CaptainDashboard({ data }: { data: any }) {
  const chartData = (data.clientHours || []).map((c: any) => ({
    name: c.name?.length > 10 ? c.name.substring(0, 10) + '...' : c.name,
    Dialokasikan: c.monthlyHours,
    Digunakan: Math.round(c.hoursThisMonth || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Crew Aktif"
          value={data.totalCrew || 0}
          subtitle="Di divisi Anda"
          icon={<Users className="h-5 w-5 text-white" />}
          color="bg-emerald-500"
        />
        <StatCard
          title="Klien"
          value={data.totalClients || 0}
          subtitle="Di divisi Anda"
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          color="bg-teal-500"
        />
        <StatCard
          title="Jam Hari Ini"
          value={`${Math.round(data.totalHoursToday || 0)} jam`}
          subtitle="Tim Anda"
          icon={<Clock className="h-5 w-5 text-white" />}
          color="bg-amber-500"
        />
        <StatCard
          title="Timer Aktif"
          value={data.activeTimers?.length || 0}
          subtitle="Sedang bekerja"
          icon={<Play className="h-5 w-5 text-white" />}
          color="bg-rose-500"
        />
      </div>

      {/* Crew Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Aktivitas Tim</CardTitle>
        </CardHeader>
        <CardContent>
          {data.crewList && data.crewList.length > 0 ? (
            <div className="space-y-3">
              {data.crewList.map((c: any) => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50/50">
                  <div className={`w-2.5 h-2.5 rounded-full ${c.hasActiveTimer ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      {c.hasActiveTimer && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                          Aktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{Math.round(c.hoursToday || 0)} jam hari ini</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada crew di divisi ini</p>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Jam Kerja per Klien</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Dialokasikan" fill="#d1fae5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Digunakan" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Belum ada data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CrewDashboard({ data }: { data: any }) {
  const { setActiveTimer, setCurrentView } = useAppStore();
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const updateElapsed = () => {
      if (!data.activeTimer) return;
      const start = new Date(data.activeTimer.startTime).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    if (data.activeTimer) {
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (!data.activeTimer) setElapsed('');
    };
  }, [data.activeTimer]);

  const handleStartTimer = () => {
    setCurrentView('timer');
  };

  return (
    <div className="space-y-6">
      {/* Timer Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
          <p className="text-emerald-100 text-sm font-medium">
            {data.activeTimer ? 'Sedang Bekerja' : 'Belum Mulai'}
          </p>
          {data.activeTimer && (
            <p className="text-white text-sm truncate">
              {data.activeTimer.task?.title} — {data.activeTimer.client?.name}
            </p>
          )}
        </div>
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <p className="text-5xl font-mono font-bold text-gray-900 tracking-wider">
            {elapsed || '00:00:00'}
          </p>
          {!data.activeTimer && (
            <Button
              onClick={handleStartTimer}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-2"
            >
              <Play className="h-4 w-4" />
              Mulai Kerja
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm text-center">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gray-900">{Math.round(data.hoursToday || 0)}</p>
            <p className="text-xs text-muted-foreground">Jam Hari Ini</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm text-center">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gray-900">{Math.round(data.hoursThisWeek || 0)}</p>
            <p className="text-xs text-muted-foreground">Jam Minggu Ini</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm text-center">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gray-900">{Math.round(data.hoursThisMonth || 0)}</p>
            <p className="text-xs text-muted-foreground">Jam Bulan Ini</p>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tugas Saya</CardTitle>
        </CardHeader>
        <CardContent>
          {data.tasks && data.tasks.length > 0 ? (
            <div className="space-y-2">
              {data.tasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <StatusBadge status={t.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.client?.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.totalLoggedHours ? `${Math.round(t.totalLoggedHours)}j` : '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada tugas</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Riwayat Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentEntries && data.recentEntries.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.recentEntries.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {e.task?.title || 'Tanpa tugas'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.duration ? `${Math.round(e.duration * 60)} menit` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada riwayat</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Menunggu', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    IN_PROGRESS: { label: 'Berlangsung', className: 'bg-sky-100 text-sky-700 border-sky-200' },
    COMPLETED: { label: 'Selesai', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Dibatalkan', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  };
  const c = config[status] || config.PENDING;
  return <Badge className={`${c.className} text-[10px] px-2 py-0.5`}>{c.label}</Badge>;
}
