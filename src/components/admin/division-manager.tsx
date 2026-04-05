'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Building2, Users, UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

const COLORS = [
  { name: 'Hijau', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Ungu', value: '#8b5cf6' },
  { name: 'Oranye', value: '#f97316' },
  { name: 'Biru Langit', value: '#0ea5e9' },
  { name: 'Merah Muda', value: '#ec4899' },
];

export default function DivisionManager() {
  const { divisions, setDivisions, users, setUsers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState({ name: '', color: '#10b981', captainId: '' });
  const [saving, setSaving] = useState(false);

  const captainOptions = (users || []).filter((u: any) => u.role === 'CAPTAIN' || u.role === 'ADMIN');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [divRes, userRes] = await Promise.all([
        fetch('/api/divisions'),
        fetch('/api/users'),
      ]);
      const divContentType = divRes.headers.get('content-type') || '';
      const userContentType = userRes.headers.get('content-type') || '';
      if (!divContentType.includes('application/json') || !userContentType.includes('application/json')) {
        return;
      }
      const divData = await divRes.json();
      const userData = await userRes.json();
      setDivisions(Array.isArray(divData) ? divData : divData?.divisions || []);
      setUsers(Array.isArray(userData) ? userData : userData?.users || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', color: '#10b981', captainId: '' });
    setDialogOpen(true);
  };

  const openEdit = (div: any) => {
    setEditing(div);
    setForm({ name: div.name, color: div.color || '#10b981', captainId: div.captainId || '' });
    setDialogOpen(true);
  };

  const openDelete = (div: any) => {
    setDeleting(div);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama divisi harus diisi');
      return;
    }
    setSaving(true);
    try {
      const url = editing ? '/api/divisions' : '/api/divisions';
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan');
        return;
      }
      toast.success(editing ? 'Divisi berhasil diperbarui' : 'Divisi berhasil dibuat');
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
      const res = await fetch('/api/divisions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleting.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghapus');
        return;
      }
      toast.success('Divisi berhasil dihapus');
      setDeleteOpen(false);
      setDeleting(null);
      fetchAll();
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kelola Divisi</h2>
          <p className="text-sm text-muted-foreground">{divisions.length} divisi terdaftar</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Tambah Divisi
        </Button>
      </div>

      {divisions.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Belum ada divisi. Buat divisi pertama Anda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {divisions.map((div: any, i: number) => (
            <motion.div
              key={div.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: div.color + '20' }}
                      >
                        <Building2 className="h-5 w-5" style={{ color: div.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{div.name}</h3>
                        {div.captain && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCircle className="h-3 w-3" />
                            {div.captain.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(div)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => openDelete(div)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {div.memberCount || 0} crew
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {div.clientCount || 0} klien
                    </span>
                  </div>
                  <div className="mt-3 w-full h-1.5 rounded-full" style={{ backgroundColor: div.color + '30' }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: div.color, width: '100%' }} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Divisi' : 'Tambah Divisi'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Perbarui informasi divisi' : 'Isi detail divisi baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Divisi</Label>
              <Input
                placeholder="Contoh: Divisi Pengembangan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ketua Divisi</Label>
              <Select value={form.captainId} onValueChange={(v) => setForm({ ...form, captainId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih ketua divisi" />
                </SelectTrigger>
                <SelectContent>
                  {captainOptions.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
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
            <AlertDialogTitle>Hapus Divisi?</AlertDialogTitle>
            <AlertDialogDescription>
              Divisi &quot;{deleting?.name}&quot; akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
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
