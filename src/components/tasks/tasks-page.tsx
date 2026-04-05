'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, ClipboardList, Filter } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktif', color: 'bg-blue-100 text-blue-700' },
  ON_HOLD: { label: 'Ditunda', color: 'bg-amber-100 text-amber-700' },
  DONE: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT: { label: 'Urgent', color: 'bg-rose-100 text-rose-700' },
  HIGH: { label: 'Tinggi', color: 'bg-orange-100 text-orange-700' },
  MEDIUM: { label: 'Sedang', color: 'bg-blue-100 text-blue-700' },
  LOW: { label: 'Rendah', color: 'bg-slate-100 text-slate-600' },
  NONE: { label: '-', color: 'bg-slate-100 text-slate-500' },
};

export function TasksPage() {
  const user = useAppStore((s) => s.user);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', project_id: '', client_id: '',
    crew_id: '', status: 'ACTIVE', priority: 'NONE', estimated_hours: '', due_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [taskRes, projRes, clientRes, userRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
        fetch('/api/clients'),
        fetch('/api/users'),
      ]);
      const allContentTypes = [taskRes, projRes, clientRes, userRes].map(
        (r) => r.headers.get('content-type') || ''
      );
      if (allContentTypes.some((ct) => !ct.includes('application/json'))) {
        return;
      }
      const [taskJson, projJson, clientJson, userJson] = await Promise.all([
        taskRes.json(), projRes.json(), clientRes.json(), userRes.json()
      ]);
      setTasks(taskJson.tasks || []);
      setProjects(projJson.projects || []);
      setClients(clientJson.clients || []);
      setUsers(userJson.users || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchProject = filterProject === 'all' || t.project_id === filterProject;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchProject && matchStatus;
  });

  const activeTasks = filteredTasks.filter((t) => t.status === 'ACTIVE');
  const onHoldTasks = filteredTasks.filter((t) => t.status === 'ON_HOLD');
  const doneTasks = filteredTasks.filter((t) => t.status === 'DONE');

  const handleCreate = () => {
    setEditingTask(null);
    setForm({
      title: '', description: '', project_id: '', client_id: '',
      crew_id: '', status: 'ACTIVE', priority: 'NONE', estimated_hours: '', due_date: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      project_id: task.project_id || '',
      client_id: task.client_id || '',
      crew_id: task.crew_id || '',
      status: task.status || 'ACTIVE',
      priority: task.priority || 'NONE',
      estimated_hours: task.estimated_hours?.toString() || '',
      due_date: task.due_date?.split('T')[0] || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.project_id || !form.client_id) {
      toast.error('Judul, proyek, dan klien wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const body = {
        ...(editingTask ? { id: editingTask.id } : {}),
        title: form.title,
        description: form.description || null,
        project_id: form.project_id,
        client_id: form.client_id,
        crew_id: form.crew_id || null,
        status: form.status,
        priority: form.priority,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        due_date: form.due_date || null,
      };

      const res = await fetch('/api/tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');

      toast.success(editingTask ? 'Tugas diperbarui' : 'Tugas dibuat');
      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tugas ini?')) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus');
      }
      toast.success('Tugas dihapus');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      toast.error(msg);
    }
  };

  const TaskCard = ({ task }: { task: any }) => {
    const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.ACTIVE;
    const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.NONE;

    return (
      <Card className="border shadow-sm hover:shadow-md transition-shadow mb-3">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-slate-900 truncate">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEdit(task)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-500" onClick={() => handleDelete(task.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {task.project && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color || '#94a3b8' }} />
                {task.project.name}
              </span>
            )}
            {task.crew && (
              <span className="text-xs text-slate-500">→ {task.crew.name}</span>
            )}
            <Badge className={`text-[10px] px-1.5 py-0 ${sc.color}`}>{sc.label}</Badge>
            <Badge className={`text-[10px] px-1.5 py-0 ${pc.color}`}>{pc.label}</Badge>
            {task.total_logged_hours > 0 && (
              <span className="text-[10px] text-slate-400">{task.total_logged_hours}j</span>
            )}
            {task.due_date && (
              <span className="text-[10px] text-slate-400">
                {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tugas</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola tugas untuk semua proyek</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Tugas Baru
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari tugas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter proyek" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Proyek</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="ON_HOLD">Ditunda</SelectItem>
            <SelectItem value="DONE">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">Papan</TabsTrigger>
            <TabsTrigger value="list">Daftar</TabsTrigger>
          </TabsList>

          {/* Kanban View */}
          <TabsContent value="kanban">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Aktif</h3>
                  <Badge variant="secondary" className="text-[10px]">{activeTasks.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                  {activeTasks.map((t) => <TaskCard key={t.id} task={t} />)}
                  {activeTasks.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">Tidak ada tugas aktif</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Ditunda</h3>
                  <Badge variant="secondary" className="text-[10px]">{onHoldTasks.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                  {onHoldTasks.map((t) => <TaskCard key={t.id} task={t} />)}
                  {onHoldTasks.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">Tidak ada tugas ditunda</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Selesai</h3>
                  <Badge variant="secondary" className="text-[10px]">{doneTasks.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                  {doneTasks.map((t) => <TaskCard key={t.id} task={t} />)}
                  {doneTasks.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">Tidak ada tugas selesai</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <Card className="mt-4">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Judul</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Proyek</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Ditugaskan</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Prioritas</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Jam</th>
                        <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTasks.map((task) => {
                        const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.ACTIVE;
                        const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.NONE;
                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-slate-900">{task.title}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project?.color || '#94a3b8' }} />
                                {task.project?.name || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{task.crew?.name || '-'}</td>
                            <td className="px-4 py-3">
                              <Badge className={`text-[10px] px-1.5 py-0 ${sc.color}`}>{sc.label}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`text-[10px] px-1.5 py-0 ${pc.color}`}>{pc.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{task.total_logged_hours}j</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(task)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(task.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredTasks.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Tidak ada tugas ditemukan</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Tugas' : 'Tugas Baru'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Ubah detail tugas' : 'Isi detail tugas baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Judul</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul tugas" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Deskripsi</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi tugas" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Proyek</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Klien</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih klien" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Ditugaskan ke</Label>
                <Select value={form.crew_id} onValueChange={(v) => setForm({ ...form, crew_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ditugaskan</SelectItem>
                    {users.filter((u) => u.role === 'CREW').map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Prioritas</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Estimasi (jam)</Label>
                <Input type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Tenggat</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Menyimpan...' : editingTask ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
