'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Plus, Search, Pencil, Trash2, Users, UserPlus, Crown, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ADMIN: { label: 'Admin', color: 'bg-rose-100 text-rose-700', icon: ShieldCheck },
  CAPTAIN: { label: 'Captain', color: 'bg-amber-100 text-amber-700', icon: Crown },
  CREW: { label: 'Crew', color: 'bg-blue-100 text-blue-700', icon: Users },
};

export function TeamPage() {
  const user = useAppStore((s) => s.user);
  const [members, setMembers] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'CREW', division_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      const [userJson, divJson] = await Promise.all([userRes.json(), divRes.json()]);
      setMembers(userJson.users || []);
      setDivisions(divJson.divisions || []);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const openCreateDialog = (preRole: string) => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: preRole, division_id: '' });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    openCreateDialog('CREW');
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'CREW',
      division_id: u.division_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Nama dan email wajib diisi');
      return;
    }
    if (!editingUser && !form.password) {
      toast.error('Password wajib diisi untuk anggota baru');
      return;
    }
    setSaving(true);
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const body: any = {
        ...(editingUser ? { id: editingUser.id } : {}),
        name: form.name,
        email: form.email,
        role: form.role,
        division_id: form.division_id || null,
      };
      if (form.password) body.password = form.password;

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');

      toast.success(editingUser ? 'Anggota diperbarui' : 'Anggota ditambahkan');
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
    if (!confirm('Yakin ingin menghapus anggota ini?')) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Gagal menghapus');
      }
      toast.success('Anggota dihapus');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus';
      toast.error(msg);
    }
  };

  const selectedRoleConfig = ROLE_CONFIG[form.role] || ROLE_CONFIG.CREW;
  const selectedDivision = divisions.find((d) => d.id === form.division_id);
  const showCaptainInfo = form.role === 'CAPTAIN' && form.division_id && !editingUser;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tim</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola anggota tim Anda</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openCreateDialog('CAPTAIN')} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Crown className="w-4 h-4 mr-1.5" />
            Tambah Captain
          </Button>
          <Button onClick={() => openCreateDialog('CREW')} className="bg-blue-600 hover:bg-blue-700 text-white">
            <UserPlus className="w-4 h-4 mr-1.5" />
            Tambah Crew
          </Button>
          <Button onClick={handleCreate} variant="outline" size="icon" className="h-9 w-9">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari anggota..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filter peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Peran</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="CAPTAIN">Captain</SelectItem>
            <SelectItem value="CREW">Crew</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-rose-600">{members.filter((m) => m.role === 'ADMIN').length}</p>
            <p className="text-sm text-slate-500">Admin</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{members.filter((m) => m.role === 'CAPTAIN').length}</p>
            <p className="text-sm text-slate-500">Captain</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{members.filter((m) => m.role === 'CREW').length}</p>
            <p className="text-sm text-slate-500">Crew</p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Anggota</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Peran</TableHead>
                  <TableHead className="text-xs">Divisi</TableHead>
                  <TableHead className="text-xs text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const rc = ROLE_CONFIG[member.role] || ROLE_CONFIG.CREW;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                              {member.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-slate-900">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{member.email}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] px-2 py-0.5 ${rc.color}`}>{rc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {member.division ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member.division.color }} />
                            {member.division.name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(member)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-500"
                            onClick={() => handleDelete(member.id)}
                            disabled={member.id === user?.id}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredMembers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Users className="w-12 h-12 mb-3" />
                <p className="text-lg font-medium">Tidak ada anggota ditemukan</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Anggota' : 'Tambah Anggota'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Ubah informasi anggota' : 'Isi detail anggota baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Nama</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Password {editingUser && <span className="text-slate-400 font-normal">(kosongkan jika tidak diubah)</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Peran</Label>
                <div className="flex items-center gap-2">
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge className={`shrink-0 text-[10px] px-2 py-0.5 ${selectedRoleConfig.color}`}>
                    {selectedRoleConfig.label}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Divisi</Label>
                <Select value={form.division_id} onValueChange={(v) => setForm({ ...form, division_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih divisi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {showCaptainInfo && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Crown className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Captain akan otomatis menjadi kapten divisi ini</p>
                  {selectedDivision && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Divisi &quot;{selectedDivision.name}&quot; akan ditetapkan dengan kapten baru.
                      {selectedDivision.captain && (
                        <span className="block mt-0.5">
                          Kapten sebelumnya ({selectedDivision.captain.name}) akan dilepaskan dari divisi.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Menyimpan...' : editingUser ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
