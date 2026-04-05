'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Mail, Lock, Database, Shield, Crown, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { setAuth } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login gagal');
        return;
      }
      setAuth(data.token, data.user);
      toast.success(`Selamat datang, ${data.user.name}!`);

      // Fetch dashboard data after login
      const dashRes = await fetch(`/api/dashboard?role=${data.user.role}&userId=${data.user.id}&divisionId=${data.user.divisionId || ''}`);
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        useAppStore.getState().setDashboardData(dashData);
      }
    } catch {
      toast.error('Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Data demo berhasil dimuat!');
      } else {
        toast.info(data.message || 'Data demo sudah ada');
      }
    } catch {
      toast.error('Gagal memuat data demo');
    } finally {
      setSeeding(false);
    }
  };

  const fillCredentials = (role: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@crew.com', password: 'password123' },
      captain: { email: 'captain1@crew.com', password: 'password123' },
      crew: { email: 'crew1@crew.com', password: 'password123' },
    };
    const cred = creds[role];
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              CrewTracker
            </CardTitle>
            <CardDescription className="text-gray-500">
              Sistem pelacakan waktu kerja tim Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo Cepat</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('admin')}
                className="text-xs"
              >
                <Shield className="h-3 w-3 mr-1 text-rose-500" />
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('captain')}
                className="text-xs"
              >
                <Crown className="h-3 w-3 mr-1 text-amber-500" />
                Captain
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('crew')}
                className="text-xs"
              >
                <UserCog className="h-3 w-3 mr-1 text-emerald-500" />
                Crew
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Database className="h-3.5 w-3.5 mr-2" />
              {seeding ? 'Memuat data...' : 'Muat Data Demo'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
