'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { BarChart3, Clock, TrendingUp, Calendar, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

export function ReportsPage() {
  const user = useAppStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchReport();
  }, [dateRange, user]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let from: Date;
      let to: Date;

      switch (dateRange) {
        case 'week':
          from = new Date(now);
          from.setDate(now.getDate() - now.getDay());
          to = new Date(from);
          to.setDate(from.getDate() + 7);
          break;
        case 'month':
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          from = new Date(now.getFullYear(), quarterStart, 1);
          to = new Date(now.getFullYear(), quarterStart + 3, 1);
          break;
        default:
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      const params = new URLSearchParams({
        role: user?.role || 'CREW',
        userId: user?.id || '',
        from: from.toISOString(),
        to: to.toISOString(),
      });
      if (user?.division_id) params.set('divisionId', user.division_id);

      const res = await fetch(`/api/reports?${params}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setReportData(json);
      }
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  const clientUtilization = reportData?.clientUtilization || [];
  const crewProductivity = reportData?.crewProductivity || [];
  const dailyTrend = reportData?.dailyTrend || [];

  // Transform daily trend for display (show day label)
  const trendData = dailyTrend.map((d: any) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
  }));

  // Find most productive day
  const mostProductiveDay = dailyTrend.reduce(
    (max: any, d: any) => (d.total_hours > (max?.total_hours || 0) ? d : max),
    null
  );

  const rangeLabel = dateRange === 'week' ? 'Minggu Ini' : dateRange === 'month' ? 'Bulan Ini' : 'Kuartal Ini';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
          <p className="text-sm text-slate-500 mt-1">Analisis produktivitas dan utilisasi tim</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Minggu Ini</SelectItem>
            <SelectItem value="month">Bulan Ini</SelectItem>
            <SelectItem value="quarter">Kuartal Ini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
          <Skeleton className="h-[300px] rounded-lg" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Total Jam</span>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600">{summary.totalHours || 0}j</p>
                <p className="text-xs text-slate-400 mt-0.5">{summary.totalEntries || 0} entri</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Rata-rata/Hari</span>
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{summary.avgHoursPerDay || 0}j</p>
                <p className="text-xs text-slate-400 mt-0.5">{summary.uniqueDays || 0} hari aktif</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Billable</span>
                  <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-violet-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-violet-600">{summary.billableHours || 0}j</p>
                <p className="text-xs text-slate-400 mt-0.5">{summary.nonBillableHours || 0}j non-billable</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Hari Terproduktif</span>
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-lg font-bold text-amber-600">
                  {mostProductiveDay
                    ? new Date(mostProductiveDay.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
                    : '-'}
                </p>
                {mostProductiveDay && (
                  <p className="text-xs text-slate-400 mt-0.5">{mostProductiveDay.total_hours} jam</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">Tren Harian ({rangeLabel})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value: number) => [`${value} jam`, 'Total']}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_hours"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crew Productivity */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">Produktivitas Tim</CardTitle>
              </CardHeader>
              <CardContent>
                {crewProductivity.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Tidak ada data</p>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={crewProductivity.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '13px',
                          }}
                          formatter={(value: number) => [`${value} jam`, 'Total']}
                        />
                        <Bar dataKey="total_hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Utilization */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">Utilisasi Klien</CardTitle>
              </CardHeader>
              <CardContent>
                {clientUtilization.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Tidak ada data</p>
                ) : (
                  <div className="space-y-4 max-h-[250px] overflow-y-auto">
                    {clientUtilization.map((cu: any) => {
                      const pct = cu.utilization_percent || 0;
                      return (
                        <div key={cu.client_id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cu.client_color || '#94a3b8' }} />
                              <span className="text-sm font-medium text-slate-900 truncate">{cu.client_name}</span>
                            </div>
                            <span className={`text-sm font-semibold shrink-0 ml-2 ${pct >= 90 ? 'text-rose-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {Math.round(pct)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{cu.used_hours}j / {cu.allocated_hours}j</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
