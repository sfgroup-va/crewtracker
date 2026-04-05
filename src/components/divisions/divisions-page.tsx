'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Settings, Users as UsersIcon, FolderOpen, Building2, Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export function DivisionsPage() {
  const user = useAppStore((s) => s.user);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [captains, setCaptains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiv, setEditingDiv] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#3b82f6', captainId: '' });

  // Inline captain creation state
  const [showNewCaptain, setShowNewCaptain] = useState(false);
  const [newCaptain, setNewCaptain] = useState({ name: '', email: '', password: '' });
  const [creatingCaptain, setCreatingCaptain] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [divRes, userRes] = await Promise.all([
        fetch('/api/divisions'),
        fetch('/api/users?role=CAPTAIN'),
      ]);
      const divContentType = divRes.headers.get('content-type') || '';
      const userContentType = userRes.headers.get('content-type') || '';
      if (!divContentType.includes('application/json') || !userContentType.includes('application/json')) {
        return;
      }
      const [divJson, userJson] = await Promise.all([divRes.json(), userRes.json()]);
      setDivisions(divJson.divisions || []);
      setCaptains(userJson.users || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDiv(null);
    setForm({ name: '', color: '#3b82f6', captainId: '' });
    setShowNewCaptain(false);
    setNewCaptain({ name: '', email: '', password: '' });
    setDialogOpen(true);
  };

  const handleEdit = (div: any) => {
    setEditingDiv(div);
    setForm({
      name: div.name || '',
      color: div.color || '#3b82f6',
      captainId: div.captain_id || '',
    });
    setShowNewCaptain(false);
    setNewCaptain({ name: '', email: '', password: '' });
    setDialogOpen(true);
  };

  const handleCreateCaptain = async () => {
    if (!newCaptain.name || !newCaptain.email || !newCaptain.password) {
      toast.error('Nama, email, dan password wajib diisi');
      return;
    }
    setCreatingCaptain(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCaptain.name,
          email: newCaptain.email,
          password: newCaptain.password,
          role: 'CAPTAIN',
          division_id: null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal membuat captain');

      const createdUser = json.user;
      if (createdUser) {
        // Add to local captains list
        setCaptains((prev) => [...prev, createdUser]);
        // Auto-select the new captain
        setForm((prev) => ({ ...prev, captainId: createdUser.id }));
        // Reset form
        setNewCaptain({ name: '', email: '', password: '' });
        setShowNewCaptain(false);
        toast.success(`Captain "${createdUser.name}" berhasil dibuat`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat captain';
      toast.error(msg);
    } finally {
      setCreatingCaptain(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.captainId) {
      toast.error('Nama dan kapten wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const method = editingDiv ? 'PUT' : 'POST';
      const body = {
        ...(editingDiv ? { id: editingDiv.id } : {}),
        name: form.name,
        color: form.color,
        captainId: form.captainId,
      };

      const res = await fetch('/api/divisions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');

      toast.success(editingDiv ? 'Divisi diperbarui' : 'Divisi dibuat');
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
    if (!confirm('Yakin ingin menghapus divisi ini? Semua anggota akan dilepaskan dari divisi.')) return;
    try {
      const res = await fetch(`/api/divisions?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus');
      }
      toast.success('Divisi dihapus');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      toast.error(msg);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowNewCaptain(false);
      setNewCaptain({ name: '', email: '', password: '' });
    }
    setDialogOpen(open);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Divisi</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola divisi dan penugasan kapten</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Divisi Baru
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : divisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Settings className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">Belum ada divisi</p>
          <p className="text-sm">Buat divisi pertama untuk memulai</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {divisions.map((div) => (
            <Card key={div.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: div.color || '#3b82f6' }}
                    >
                      {div.name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{div.name}</h3>
                      {div.captain && (
                        <p className="text-xs text-slate-500">Kapten: {div.captain.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(div)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(div.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <UsersIcon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900">{div.memberCount || 0}</p>
                    <p className="text-[10px] text-slate-500">Anggota</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900">{div.clientCount || 0}</p>
                    <p className="text-[10px] text-slate-500">Klien</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <FolderOpen className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900">{div.projectCount || 0}</p>
                    <p className="text-[10px] text-slate-500">Proyek</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDiv ? 'Edit Divisi' : 'Divisi Baru'}</DialogTitle>
            <DialogDescription>
              {editingDiv ? 'Ubah informasi divisi' : 'Isi detail divisi baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Nama Divisi</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama divisi" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Kapten</Label>
              {!showNewCaptain ? (
                <div className="space-y-2">
                  <Select value={form.captainId} onValueChange={(v) => setForm({ ...form, captainId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kapten" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new_captain" className="text-amber-600 font-medium">
                        <span className="flex items-center gap-2">
                          <Plus className="w-3 h-3" />
                          Buat Captain Baru
                        </span>
                      </SelectItem>
                      {captains.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2"
                    onClick={() => {
                      setShowNewCaptain(true);
                      setForm((prev) => ({ ...prev, captainId: '' }));
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Buat captain baru langsung
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">Captain Baru</p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Nama captain"
                      value={newCaptain.name}
                      onChange={(e) => setNewCaptain((p) => ({ ...p, name: e.target.value }))}
                      className="h-8 text-sm bg-white"
                    />
                    <Input
                      placeholder="Email captain"
                      type="email"
                      value={newCaptain.email}
                      onChange={(e) => setNewCaptain((p) => ({ ...p, email: e.target.value }))}
                      className="h-8 text-sm bg-white"
                    />
                    <Input
                      placeholder="Password"
                      type="password"
                      value={newCaptain.password}
                      onChange={(e) => setNewCaptain((p) => ({ ...p, password: e.target.value }))}
                      className="h-8 text-sm bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={handleCreateCaptain}
                      disabled={creatingCaptain}
                    >
                      {creatingCaptain ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Buat & Pilih
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-slate-500"
                      onClick={() => {
                        setShowNewCaptain(false);
                        setNewCaptain({ name: '', email: '', password: '' });
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Warna</Label>
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${form.color === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Menyimpan...' : editingDiv ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
