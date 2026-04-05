'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ClipboardList, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Menunggu', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  IN_PROGRESS: { label: 'Berlangsung', className: 'bg-sky-100 text-sky-700 border-sky-200' },
  COMPLETED: { label: 'Selesai', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Dibatalkan', className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Rendah', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  MEDIUM: { label: 'Sedang', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  HIGH: { label: 'Tinggi', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  URGENT: { label: 'Mendesak', className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export default function TaskManager() {
  const { user, tasks, setTasks, clients, setClients, users, setUsers, divisions } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', description: '', clientId: '', crewId: '', estimatedHours: '',
    status: 'PENDING', priority: 'MEDIUM', dueDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [filterCrew, setFilterCrew] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.role === 'CREW') params.set('crewId', user.id);
      if (user?.divisionId) params.set('divisionId', user.divisionId);

      const [taskRes, clientRes, userRes] = await Promise.all([
        fetch(`/api/tasks?${params}`),
        fetch('/api/clients'),
        fetch('/api/users'),
      ]);
      const taskContentType = taskRes.headers.get('content-type') || '';
      const clientContentType = clientRes.headers.get('content-type') || '';
      const userContentType = userRes.headers.get('content-type') || '';
      if (!taskContentType.includes('application/json') || !clientContentType.includes('application/json') || !userContentType.includes('application/json')) {
        return;
      }
      const taskData = await taskRes.json();
      const clientData = await clientRes.json();
      const userData = await userRes.json();
      setTasks(Array.isArray(taskData) ? taskData : taskData?.tasks || []);
      setClients(Array.isArray(clientData) ? clientData : clientData?.clients || []);
      setUsers(Array.isArray(userData) ? userData : userData?.users || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const crewOptions = (users || []).filter((u: any) => u.role === 'CREW');

  const filteredTasks = tasks.filter((t: any) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterClient !== 'all' && t.clientId !== filterClient) return false;
    if (filterCrew !== 'all' && t.crewId !== filterCrew) return false;
    return true;
  });

  const getClientName = (id: string) => clients.find((c: any) => c.id === id)?.name || '-';
  const getCrewName = (id?: string) => {
    if (!id) return '-';
    return users.find((u: any) => u.id === id)?.name || '-';
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '', description: '', clientId: '', crewId: '',
      estimatedHours: '', status: 'PENDING', priority: 'MEDIUM', dueDate: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (task: any) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || '',
      clientId: task.clientId || '',
      crewId: task.crewId || '',
      estimatedHours: task.estimatedHours?.toString() || '',
      status: task.status || 'PENDING',
      priority: task.priority || 'MEDIUM',
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    });
    setDialogOpen(true);
  };

  const openDelete = (task: any) => {
    setDeleting(task);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.clientId) {
      toast.error('Judul dan klien harus diisi');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        title: form.title,
        description: form.description || null,
        clientId: form.clientId,
        crewId: form.crewId || null,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      };
      if (editing) body.id = editing.id;

      const method = editing ? 'PUT' : 'POST';
      const res = await fetch('/api/tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan');
        return;
      }
      toast.success(editing ? 'Tugas berhasil diperbarui' : 'Tugas berhasil dibuat');
      setDialogOpen(false);
      fetchAll();
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleting.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghapus');
        return;
      }
      toast.success('Tugas berhasil dihapus');
      setDeleteOpen(false);
      setDeleting(null);
      fetchAll();
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kelola Tugas</h2>
          <p className="text-sm text-muted-foreground">{filteredTasks.length} tugas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'card' ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground'
              }`}
            >
              Kartu
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground'
              }`}
            >
              Tabel
            </button>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Tambah Tugas
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Klien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Klien</SelectItem>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCrew} onValueChange={setFilterCrew}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Crew" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Crew</SelectItem>
            {crewOptions.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Tidak ada tugas ditemukan.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task: any, i: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{task.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{getClientName(task.clientId)}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => openDelete(task)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge className={STATUS_CONFIG[task.status]?.className || STATUS_CONFIG.PENDING.className}>
                      {STATUS_CONFIG[task.status]?.label || task.status}
                    </Badge>
                    <Badge className={PRIORITY_CONFIG[task.priority]?.className || PRIORITY_CONFIG.MEDIUM.className}>
                      {PRIORITY_CONFIG[task.priority]?.label || task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getCrewName(task.crewId)}</span>
                    <span>{task.totalLoggedHours ? `${Math.round(task.totalLoggedHours)}j / ${task.estimatedHours ? Math.round(task.estimatedHours) + 'j' : '-'}` : task.estimatedHours ? `0j / ${Math.round(task.estimatedHours)}j` : '-'}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tugas</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Klien</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Crew</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Prioritas</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Jam</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task: any) => (
                  <tr key={task.id} className="border-t hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 font-medium">{task.title}</td>
                    <td className="p-3 text-muted-foreground">{getClientName(task.clientId)}</td>
                    <td className="p-3 text-muted-foreground">{getCrewName(task.crewId)}</td>
                    <td className="p-3">
                      <Badge className={STATUS_CONFIG[task.status]?.className || ''}>
                        {STATUS_CONFIG[task.status]?.label || task.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={PRIORITY_CONFIG[task.priority]?.className || ''}>
                        {PRIORITY_CONFIG[task.priority]?.label || task.priority}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {task.totalLoggedHours ? `${Math.round(task.totalLoggedHours)}` : '0'} / {task.estimatedHours ? Math.round(task.estimatedHours) : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => openDelete(task)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Tugas' : 'Tambah Tugas'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Perbarui informasi tugas' : 'Isi detail tugas baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Judul Tugas</Label>
              <Input
                placeholder="Contoh: Desain UI Dashboard"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                placeholder="Detail tugas (opsional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Klien</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih klien" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ditugaskan ke</Label>
              <Select value={form.crewId} onValueChange={(v) => setForm({ ...form, crewId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih crew (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {crewOptions.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimasi Jam</Label>
                <Input
                  type="number"
                  placeholder="8"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tenggat</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Menyimpan...' : editing ? 'Perbarui' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tugas?</AlertDialogTitle>
            <AlertDialogDescription>
              Tugas &quot;{deleting?.title}&quot; akan dihapus beserta semua catatan waktu terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
