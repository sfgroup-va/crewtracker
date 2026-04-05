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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClientsPage() {
  const user = useAppStore((s) => s.user);
  const [clients, setClients] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', division_id: '', monthly_hours: '160', hourly_rate: '', color: '#3b82f6',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      const [clientJson, divJson] = await Promise.all([clientRes.json(), divRes.json()]);
      setClients(clientJson.clients || []);
      setDivisions(divJson.divisions || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditingClient(null);
    setForm({ name: '', email: '', phone: '', division_id: '', monthly_hours: '160', hourly_rate: '', color: '#3b82f6' });
    setDialogOpen(true);
  };

  const handleEdit = (c: any) => {
    setEditingClient(c);
    setForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      division_id: c.division_id || '',
      monthly_hours: c.monthly_hours?.toString() || '160',
      hourly_rate: c.hourly_rate?.toString() || '',
      color: c.color || '#3b82f6',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.division_id) {
      toast.error('Nama dan divisi wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const method = editingClient ? 'PUT' : 'POST';
      const body = {
        ...(editingClient ? { id: editingClient.id } : {}),
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        division_id: form.division_id,
        monthly_hours: parseFloat(form.monthly_hours) || 160,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        color: form.color,
      };

      const res = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');

      toast.success(editingClient ? 'Klien diperbarui' : 'Klien ditambahkan');
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
    if (!confirm('Yakin ingin menghapus klien ini?')) return;
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus');
      }
      toast.success('Klien dihapus');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      toast.error(msg);
    }
  };

  const getUtilColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const totalAllocated = clients.reduce((sum, c) => sum + (c.monthly_hours || 0), 0);
  const totalUsed = clients.reduce((sum, c) => sum + (c.hours_used_this_month || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Klien</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola klien dan alokasi jam bulanan</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Klien Baru
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Klien</p>
            <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Jam Teralokasi</p>
            <p className="text-2xl font-bold text-blue-600">{totalAllocated}j</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Jam Terpakai</p>
            <p className="text-2xl font-bold text-emerald-600">{Math.round(totalUsed)}j</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Cari klien..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Klien</TableHead>
                  <TableHead className="text-xs">Divisi</TableHead>
                  <TableHead className="text-xs">Jam Bulanan</TableHead>
                  <TableHead className="text-xs">Utilisasi</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const utilPct = client.monthly_hours > 0 ? ((client.hours_used_this_month || 0) / client.monthly_hours) * 100 : 0;
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: client.color || '#94a3b8' }} />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{client.name}</p>
                            {client.email && <p className="text-xs text-slate-400">{client.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{client.division?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{client.hours_used_this_month || 0}j</span>
                          <span className="text-slate-400"> / {client.monthly_hours}j</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={utilPct >= 90 ? 'text-rose-600 font-medium' : utilPct >= 70 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                              {Math.round(utilPct)}%
                            </span>
                          </div>
                          <Progress value={Math.min(100, utilPct)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(client)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredClients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Building2 className="w-12 h-12 mb-3" />
                <p className="text-lg font-medium">Tidak ada klien ditemukan</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Klien' : 'Klien Baru'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Ubah informasi klien' : 'Isi detail klien baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Nama Klien</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama perusahaan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Telepon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telepon" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Divisi</Label>
              <Select value={form.division_id} onValueChange={(v) => setForm({ ...form, division_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Jam Bulanan</Label>
                <Input type="number" value={form.monthly_hours} onChange={(e) => setForm({ ...form, monthly_hours: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Tarif/Jam</Label>
                <Input type="number" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} placeholder="Opsional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Warna</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Menyimpan...' : editingClient ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
