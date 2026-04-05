'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Clock, Eye, EyeOff, Zap } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    email: 'admin@crewtracker.com',
    password: 'password123',
    color: 'bg-blue-600 hover:bg-blue-700',
    icon: '👑',
  },
  {
    label: 'Captain',
    email: 'captain1@crewtracker.com',
    password: 'password123',
    color: 'bg-amber-600 hover:bg-amber-700',
    icon: '⭐',
  },
  {
    label: 'Crew',
    email: 'crew1@crewtracker.com',
    password: 'password123',
    color: 'bg-emerald-600 hover:bg-emerald-700',
    icon: '🔧',
  },
];

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAppStore((s) => s.setAuth);

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    if (!loginEmail || !loginPassword) {
      toast.error('Email dan password diperlukan');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      // Check if response is actually JSON (not HTML error page)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server sedang restart. Coba lagi dalam beberapa detik.');
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Gagal masuk');
      }

      setAuth(json.token, json.user);
      toast.success(`Selamat datang, ${json.user.name}!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal masuk';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  const handleDemoLogin = (demo: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(demo.email);
    setPassword(demo.password);
    handleLogin(demo.email, demo.password);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">CrewTracker</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Lacak waktu kerja tim<br />
            dengan mudah & akurat
          </h1>

          <p className="text-lg text-blue-200/70 max-w-md leading-relaxed mb-10">
            Kelola waktu, proyek, dan produktivitas tim dalam satu platform terintegrasi.
            Dilengkapi dengan timer, laporan, dan dashboard real-time.
          </p>

          <div className="space-y-4">
            {[
              '⏱️ Timer real-time dengan deskripsi pekerjaan',
              '📊 Dashboard & laporan produktivitas',
              '👥 Manajemen tim berbasis divisi',
              '📋 Tracking proyek & tugas',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100/80">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">CrewTracker</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Masuk ke akun Anda</h2>
            <p className="text-slate-500 mt-1">Masukkan kredensial untuk melanjutkan</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@perusahaan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          {/* Demo Accounts */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-slate-700">Akses Cepat Demo</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.label}
                  onClick={() => handleDemoLogin(demo)}
                  disabled={loading}
                  className={`${demo.color} text-white rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50`}
                >
                  <span className="block text-lg mb-0.5">{demo.icon}</span>
                  {demo.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Gunakan akun demo untuk melihat fitur berdasarkan peran
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
