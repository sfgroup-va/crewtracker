'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock, FolderOpen, Users, Timer, TrendingUp, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function DashboardPage() {
  const user = useAppStore((s) => s.user);
  const dashboardData = useAppStore((s) => s.dashboardData);
  const setDashboardData = useAppStore((s) => s.setDashboardData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          role: user?.role || 'CREW',
          userId: user?.id || '',
        });
        if (user?.division_id) params.set('divisionId', user.division_id);

        const res = await fetch(`/api/dashboard?${params}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return;
        }
        const json = await res.json();
        if (res.ok) {
          setDashboardData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user, setDashboardData]);

  const stats = dashboardData?.stats || {};
  const isCrew = user?.role === 'CREW';

  // Weekly chart data
  const getWeeklyData = () => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    return days.map((name, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      // Random data for demo since we don't have per-day breakdown from dashboard API
      const base = isCrew ? 2 : 8;
      const hours = i < now.getDay() ? +(Math.random() * base + 1).toFixed(1) : 0;
      return { name, hours };
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isCrew ? 'Ringkasan aktivitas kerja Anda' : 'Ringkasan aktivitas tim'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isCrew ? (
          <>
            <StatCard
              title="Jam Hari Ini"
              value={`${stats.hoursToday || 0}j`}
              icon={Clock}
              color="blue"
            />
            <StatCard
              title="Jam Minggu Ini"
              value={`${stats.hoursWeek || 0}j`}
              icon={TrendingUp}
              color="emerald"
            />
            <StatCard
              title="Jam Bulan Ini"
              value={`${stats.hoursMonth || 0}j`}
              icon={Timer}
              color="violet"
            />
            <StatCard
              title="Tugas Aktif"
              value={dashboardData?.myTasks?.filter((t: any) => t.status !== 'DONE').length || 0}
              icon={Activity}
              color="amber"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Total Jam"
              value={`${stats.hoursThisMonth || 0}j`}
              icon={Clock}
              color="blue"
              subtitle="bulan ini"
            />
            <StatCard
              title="Tim Aktif"
              value={stats.totalCrew || 0}
              icon={Users}
              color="emerald"
              subtitle="anggota"
            />
            <StatCard
              title="Proyek Aktif"
              value={stats.totalProjects || 0}
              icon={FolderOpen}
              color="violet"
              subtitle="sedang berjalan"
            />
            <StatCard
              title="Utilisasi"
              value={`${stats.avgUtilization || 0}%`}
              icon={TrendingUp}
              color="amber"
              subtitle="rata-rata"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Jam Kerja Minggu Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getWeeklyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value: number) => [`${value} jam`, 'Total']}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Timer / Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              {isCrew ? 'Timer Aktif' : 'Tim Aktif'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCrew ? (
              <div className="space-y-4">
                {stats.hasActiveTimer ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Timer sedang berjalan</p>
                      <p className="text-xs text-slate-500">
                        {stats.activeTimer?.description || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="w-3 h-3 rounded-full bg-slate-300" />
                    <p className="text-sm text-slate-500">Tidak ada timer aktif</p>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Hari ini</span>
                    <span className="text-sm font-semibold text-slate-900">{stats.hoursToday || 0} jam</span>
                  </div>
                  <Progress value={Math.min(100, ((stats.hoursToday || 0) / 8) * 100)} className="h-2" />
                  <p className="text-xs text-slate-400">Target: 8 jam/hari</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Timer aktif</span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {stats.activeTimers || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total klien</span>
                  <span className="text-sm font-semibold">{stats.totalClients || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Utilisasi rata-rata</span>
                  <span className="text-sm font-semibold">{stats.avgUtilization || 0}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks / Crew List */}
      {!isCrew && dashboardData?.crewList && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Status Tim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-4">Nama</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-4">Hari Ini</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2 pr-4">Minggu Ini</th>
                    <th className="text-left text-xs font-medium text-slate-500 pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dashboardData.crewList.slice(0, 10).map((member: any) => (
                    <tr key={member.id}>
                      <td className="py-2.5 pr-4">
                        <span className="text-sm font-medium text-slate-900">{member.name}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-sm text-slate-600">{member.hours_today}j</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-sm text-slate-600">{member.hours_week}j</span>
                      </td>
                      <td className="py-2.5">
                        {member.has_active_timer ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Offline</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crew's Recent Entries & Tasks */}
      {isCrew && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Entries */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">Entri Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentEntries?.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Belum ada entri waktu</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {dashboardData.recentEntries.slice(0, 10).map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <span
                        className="w-2 h-2 rounded-full mt-2 shrink-0"
                        style={{ backgroundColor: entry.project?.color || '#94a3b8' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {entry.description || entry.project?.name || 'Tanpa deskripsi'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {entry.project?.name} · {entry.duration}j
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(entry.start_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">Tugas Saya</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.myTasks?.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Tidak ada tugas</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {dashboardData.myTasks.slice(0, 10).map((task: any) => (
                    <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <span
                        className="w-2 h-2 rounded-full mt-2 shrink-0"
                        style={{ backgroundColor: task.project?.color || '#94a3b8' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${
                              task.status === 'DONE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : task.status === 'ACTIVE'
                                ? 'bg-blue-100 text-blue-700'
                                : task.status === 'ON_HOLD'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.status === 'DONE' ? 'Selesai' : task.status === 'ACTIVE' ? 'Aktif' : task.status === 'ON_HOLD' ? 'Ditunda' : task.status}
                          </Badge>
                          <span className="text-xs text-slate-400">{task.my_logged_hours || 0}j</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Division Breakdown (Admin only) */}
      {user?.role === 'ADMIN' && dashboardData?.divisionStats?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Utilisasi per Divisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.divisionStats.map((div: any) => (
                <div key={div.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: div.color }} />
                      <span className="text-sm font-medium text-slate-900">{div.name}</span>
                      <span className="text-xs text-slate-400">{div.crew_count} anggota</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{div.hours_this_month}j</span>
                  </div>
                  <Progress
                    value={Math.min(100, (div.hours_this_month / (div.crew_count * 160)) * 100)}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  const colorClasses: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-600' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', text: 'text-violet-600' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-600' },
  };

  const c = colorClasses[color] || colorClasses.blue;

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">{title}</span>
          <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${c.icon}`} />
          </div>
        </div>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
