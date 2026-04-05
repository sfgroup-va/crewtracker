'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

export function ProjectsPage() {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', client_id: '', division_id: '', color: '#3b82f6', estimate_hours: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, clientRes, divRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients'),
        fetch('/api/divisions'),
      ]);
      const allContentTypes = [projRes, clientRes, divRes].map(
        (r) => r.headers.get('content-type') || ''
      );
      if (allContentTypes.some((ct) => !ct.includes('application/json'))) {
        return;
      }
      const [projJson, clientJson, divJson] = await Promise.all([
        projRes.json(), clientRes.json(), divRes.json()
      ]);
      setProjects(projJson.projects || []);
      setClients(clientJson.clients || []);
      setDivisions(divJson.divisions || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchClient = filterClient === 'all' || p.client_id === filterClient;
    return matchSearch && matchClient;
  });

  const handleCreate = () => {
    setEditingProject(null);
    setForm({ name: '', client_id: '', division_id: '', color: '#3b82f6', estimate_hours: '' });
    setDialogOpen(true);
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      client_id: project.client_id || '',
      division_id: project.division_id || '',
      color: project.color || '#3b82f6',
      estimate_hours: project.estimate_hours?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.client_id || !form.division_id) {
      toast.error('Nama, klien, dan divisi wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const url = editingProject ? '/api/projects' : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';
      const body = {
        ...(editingProject ? { id: editingProject.id } : {}),
        name: form.name,
        client_id: form.client_id,
        division_id: form.division_id,
        color: form.color,
        estimate_hours: form.estimate_hours ? parseFloat(form.estimate_hours) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');

      toast.success(editingProject ? 'Proyek diperbarui' : 'Proyek dibuat');
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
    if (!confirm('Yakin ingin menghapus proyek ini?')) return;
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus');
      }
      toast.success('Proyek dihapus');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      toast.error(msg);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proyek</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola semua proyek tim Anda</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Proyek Baru
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari proyek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter klien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Klien</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <FolderOpen className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">Tidak ada proyek ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color || '#3b82f6' }} />
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{project.name}</h3>
                  </div>
                  {project.is_active === false && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Nonaktif</Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-xs text-slate-500">
                    Klien: <span className="text-slate-700">{project.client?.name || '-'}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Divisi: <span className="text-slate-700">{project.division?.name || '-'}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Estimasi: <span className="text-slate-700">{project.estimate_hours || '-'} jam</span>
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{project.hours_this_month || 0}j bulan ini</span>
                    <span className="text-slate-500">{project.task_count || 0} tugas</span>
                  </div>
                  {project.estimate_hours ? (
                    <Progress
                      value={Math.min(100, ((project.hours_this_month || 0) / project.estimate_hours) * 100)}
                      className="h-1.5"
                    />
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex gap-1 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(project)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(project.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Proyek' : 'Proyek Baru'}</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Ubah informasi proyek' : 'Isi detail proyek baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Nama Proyek</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama proyek"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Klien</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih klien" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Divisi</Label>
              <Select value={form.division_id} onValueChange={(v) => setForm({ ...form, division_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih divisi" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Warna</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Estimasi (jam)</Label>
                <Input
                  type="number"
                  value={form.estimate_hours}
                  onChange={(e) => setForm({ ...form, estimate_hours: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Menyimpan...' : editingProject ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
