'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Filter, Users as UsersIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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

export default function ClientManager() {
  const { clients, setClients, divisions, setDivisions } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', divisionId: '', monthlyHours: 160, isActive: true });
  const [saving, setSaving] = useState(false);
  const [filterDiv, setFilterDiv] = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

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
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = filterDiv === 'all'
    ? clients
    : clients.filter((c: any) => c.divisionId === filterDiv);

  const getDivisionName = (divId: string) => {
    const div = divisions.find((d: any) => d.id === divId);
    return div?.name || '-';
  };

  const getDivisionColor = (divId: string) => {
    const div = divisions.find((d: any) => d.id === divId);
    return div?.color || '#10b981';
  };

  const getUtilColor = (util: number) => {
    if (util < 70) return 'bg-emerald-500';
    if (util < 90) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', divisionId: '', monthlyHours: 160, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (client: any) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      divisionId: client.divisionId || '',
      monthlyHours: client.monthlyHours || 160,
      isActive: client.isActive !== false,
    });
    setDialogOpen(true);
  };

  const openDelete = (client: any) => {
    setDeleting(client);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.divisionId) {
      toast.error('Nama dan divisi harus diisi');
      return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan');
        return;
      }
      toast.success(editing ? 'Klien berhasil diperbarui' : 'Klien berhasil dibuat');
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
      const res = await fetch('/api/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleting.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghapus');
        return;
      }
      toast.success('Klien berhasil dihapus');
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
          <h2 className="text-lg font-semibold text-gray-900">Kelola Klien</h2>
          <p className="text-sm text-muted-foreground">{filteredClients.length} klien</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Tambah Klien
          </Button>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Belum ada klien.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead className="text-right">Jam/Bulan</TableHead>
                  <TableHead className="text-right">Digunakan</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Utilisasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client: any) => {
                  const used = Math.round(client.hoursThisMonth || 0);
                  const allocated = client.monthlyHours || 160;
                  const remaining = allocated - used;
                  const util = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: getDivisionColor(client.divisionId) + '20',
                            color: getDivisionColor(client.divisionId),
                            borderColor: getDivisionColor(client.divisionId) + '40',
                          }}
                        >
                          {getDivisionName(client.divisionId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{allocated} jam</TableCell>
                      <TableCell className="text-right">{used} jam</TableCell>
                      <TableCell className="text-right">
                        <span className={remaining < 0 ? 'text-rose-600 font-medium' : ''}>
                          {remaining} jam
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Progress value={Math.min(util, 100)} className={`h-2 flex-1 [&>div]:${getUtilColor(util)}`} />
                          <span className="text-xs text-muted-foreground w-9 text-right">{util}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={client.isActive !== false ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
                          {client.isActive !== false ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => openDelete(client)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Klien' : 'Tambah Klien'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Perbarui informasi klien' : 'Isi detail klien baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Klien</Label>
              <Input
                placeholder="Contoh: PT Maju Jaya"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="email@klien.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                placeholder="+62 xxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Divisi</Label>
              <Select value={form.divisionId} onValueChange={(v) => setForm({ ...form, divisionId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih divisi" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jam Per Bulan</Label>
              <Input
                type="number"
                value={form.monthlyHours}
                onChange={(e) => setForm({ ...form, monthlyHours: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>Aktif</Label>
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
            <AlertDialogTitle>Hapus Klien?</AlertDialogTitle>
            <AlertDialogDescription>
              Klien &quot;{deleting?.name}&quot; akan dihapus secara permanen beserta semua tugas terkait.
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
