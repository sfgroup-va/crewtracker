'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, Calendar, Download, Clock, TrendingUp, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function ReportsView() {
  const { user, divisions, setDivisions, clients, setClients } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [filterDiv, setFilterDiv] = useState('all');
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchAll();
  }, [dateRange, filterDiv]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [clientRes, divRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/divisions'),
      ]);
      const clientContentType = clientRes.headers.get('content-type') || '';
      const divContentType = divRes.headers.get('content-type') || '';
      if (!clientContentType.includes('application/json') || !divContentType.includes('application/json')) {
        return;
      }
      const clientData = await clientRes.json();
      const divData = await divRes.json();
      setClients(Array.isArray(clientData) ? clientData : clientData?.clients || []);
      setDivisions(Array.isArray(divData) ? divData : divData?.divisions || []);

      // Build date range
      let from: Date;
      let to: Date = new Date();
      switch (dateRange) {
        case 'week':
          from = subDays(new Date(), 7);
          break;
        case 'month':
          from = startOfMonth(new Date());
          to = endOfMonth(new Date());
          break;
        case 'quarter':
          from = subDays(new Date(), 90);
          break;
        default:
          from = subDays(new Date(), 30);
      }

      // Fetch timer entries for the range
      const timerRes = await fetch(
        `/api/timer?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      const timerContentType = timerRes.headers.get('content-type') || '';
      if (!timerContentType.includes('application/json')) {
        return;
      }
      const timerData = await timerRes.json();
      const entries = Array.isArray(timerData)
        ? timerData.filter((e: any) => e.endTime && e.duration)
        : timerData.entries?.filter((e: any) => e.endTime && e.duration) || [];

      const filteredClients = filterDiv === 'all'
        ? clientData
        : clientData.filter((c: any) => c.divisionId === filterDiv);

      // Client utilization data
      const clientChartData = filteredClients.map((c: any) => ({
        name: c.name?.length > 12 ? c.name.substring(0, 12) + '...' : c.name,
        Dialokasikan: c.monthlyHours || 0,
        Digunakan: Math.round(
          entries
            .filter((e: any) => e.clientId === c.id)
            .reduce((sum: number, e: any) => sum + (e.duration || 0), 0)
        ),
      }));

      // Crew productivity data
      const crewHours: Record<string, { name: string; hours: number }> = {};
      entries.forEach((e: any) => {
        const name = e.crew?.name || 'Tidak Diketahui';
        if (!crewHours[e.crewId]) {
          crewHours[e.crewId] = { name, hours: 0 };
        }
        crewHours[e.crewId].hours += e.duration || 0;
      });
      const crewChartData = Object.values(crewHours)
        .map((c) => ({ name: c.name, 'Jam Kerja': Math.round(c.hours) }))
        .sort((a, b) => b['Jam Kerja'] - a['Jam Kerja'])
        .slice(0, 10);

      // Daily trend data
      const dailyHours: Record<string, number> = {};
      const daysDiff = differenceInDays(to, from);
      for (let i = 0; i <= daysDiff; i++) {
        const day = format(subDays(to, i), 'yyyy-MM-dd');
        dailyHours[day] = 0;
      }
      entries.forEach((e: any) => {
        if (e.endTime) {
          const day = format(new Date(e.endTime), 'yyyy-MM-dd');
          if (dailyHours[day] !== undefined) {
            dailyHours[day] += e.duration || 0;
          }
        }
      });
      const dailyChartData = Object.entries(dailyHours)
        .map(([date, hours]) => ({
          name: format(new Date(date), 'd MMM', { locale: localeId }),
          'Jam Kerja': Math.round(hours * 10) / 10,
        }))
        .reverse();

      // Summary stats
      const totalHours = entries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
      const avgUtil = filteredClients.length > 0
        ? filteredClients.reduce((sum: number, c: any) => {
            const used = entries
              .filter((e: any) => e.clientId === c.id)
              .reduce((s: number, e: any) => s + (e.duration || 0), 0);
            return sum + Math.min(Math.round((used / (c.monthlyHours || 160)) * 100), 100);
          }, 0) / filteredClients.length
        : 0;
      const busiestDay = dailyChartData.reduce(
        (max: any, d: any) => d['Jam Kerja'] > (max?.['Jam Kerja'] || 0) ? d : max,
        { name: '-', 'Jam Kerja': 0 }
      );

      setReportData({
        clientChartData,
        crewChartData,
        dailyChartData,
        totalHours: Math.round(totalHours),
        avgUtilization: Math.round(avgUtil),
        busiestDay,
      });
    } catch {
      toast.error('Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!reportData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Laporan</h2>
          <p className="text-sm text-muted-foreground">Analisis produktivitas tim</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 Hari Terakhir</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="quarter">3 Bulan Terakhir</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDiv} onValueChange={setFilterDiv}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semua Divisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Divisi</SelectItem>
              {divisions.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => toast.info('Fitur ekspor segera hadir')}>
            <Download className="h-4 w-4" />
            Ekspor
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reportData.totalHours} jam</p>
              <p className="text-xs text-muted-foreground">Total Jam Kerja</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reportData.avgUtilization}%</p>
              <p className="text-xs text-muted-foreground">Rata-rata Utilisasi</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{reportData.busiestDay.name}</p>
              <p className="text-xs text-muted-foreground">Hari Terpadat ({reportData.busiestDay['Jam Kerja']} jam)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Utilization */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Utilisasi per Klien</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.clientChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reportData.clientChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
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

        {/* Crew Productivity */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Produktivitas per Crew</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.crewChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reportData.crewChartData} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Bar dataKey="Jam Kerja" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">Belum ada data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Tren Harian</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Jam Kerja"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Belum ada data</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
