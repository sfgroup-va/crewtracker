'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  ADMIN: { label: 'Admin', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  CAPTAIN: { label: 'Captain', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  CREW: { label: 'Crew', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export default function CrewManager() {
  const { users, setUsers, divisions, setDivisions } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CREW', divisionId: '' });
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterDiv, setFilterDiv] = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [userRes, divRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/divisions'),
      ]);
      const userContentType = userRes.headers.get('content-type') || '';
      const divContentType = divRes.headers.get('content-type') || '';
      if (!userContentType.includes('application/json') || !divContentType.includes('application/json')) {
        return;
      }
      const userData = await userRes.json();
      const divData = await divRes.json();
      setUsers(Array.isArray(userData) ? userData : userData?.users || []);
      setDivisions(Array.isArray(divData) ? divData : divData?.divisions || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u: any) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterDiv !== 'all' && u.divisionId !== filterDiv) return false;
    return true;
  });

  const getDivisionName = (divId?: string) => {
    if (!divId) return '-';
    const div = divisions.find((d: any) => d.id === divId);
    return div?.name || '-';
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'CREW', divisionId: '' });
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      divisionId: user.divisionId || '',
    });
    setDialogOpen(true);
  };

  const openDelete = (user: any) => {
    setDeleting(user);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Nama dan email harus diisi');
      return;
    }
    if (!editing && !form.password.trim()) {
      toast.error('Password harus diisi untuk pengguna baru');
      return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const body: any = editing
        ? { id: editing.id, name: form.name, email: form.email, role: form.role, divisionId: form.divisionId || null }
        : { name: form.name, email: form.email, password: form.password, role: form.role, divisionId: form.divisionId || null };
      if (form.password.trim()) {
        body.password = form.password;
      }
      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan');
        return;
      }
      toast.success(editing ? 'Pengguna berhasil diperbarui' : 'Pengguna berhasil dibuat');
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
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleting.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghapus');
        return;
      }
      toast.success('Pengguna berhasil dihapus');
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
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Kelola Tim</h2>
          <p className="text-sm text-muted-foreground">{filteredUsers.length} pengguna</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="CAPTAIN">Captain</SelectItem>
              <SelectItem value="CREW">Crew</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDiv} onValueChange={setFilterDiv}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Semua Divisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Divisi</SelectItem>
              {divisions.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Tidak ada pengguna ditemukan.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_CONFIG[user.role]?.className || ROLE_CONFIG.CREW.className}>
                        {ROLE_CONFIG[user.role]?.label || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getDivisionName(user.divisionId)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => openDelete(user)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Anggota' : 'Tambah Anggota'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Perbarui informasi anggota' : 'Isi detail anggota baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                placeholder="Nama lengkap"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="email@perusahaan.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{editing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</Label>
              <Input
                placeholder={editing ? '••••••••' : 'Minimal 6 karakter'}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="CAPTAIN">Captain</SelectItem>
                  <SelectItem value="CREW">Crew</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Divisi</Label>
              <Select value={form.divisionId} onValueChange={(v) => setForm({ ...form, divisionId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih divisi (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <AlertDialogTitle>Hapus Anggota?</AlertDialogTitle>
            <AlertDialogDescription>
              Anggota &quot;{deleting?.name}&quot; akan dihapus secara permanen.
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
