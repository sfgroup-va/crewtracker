'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Loader2, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type SetupStep = 'copy-sql' | 'waiting-detection' | 'seeding' | 'done' | 'error';

const SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/ussppownncyiniojqlgb/sql';

const SETUP_SQL = `-- CrewTracker - Database Schema
-- Paste di Supabase SQL Editor lalu klik Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CREW' CHECK (role IN ('ADMIN', 'CAPTAIN', 'CREW')),
  avatar TEXT,
  division_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS divisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  captain_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_division'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_division
      FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  monthly_hours INTEGER NOT NULL DEFAULT 160,
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  estimate_hours DECIMAL(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  division_id TEXT REFERENCES divisions(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  crew_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  estimated_hours DECIMAL(8,2),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DONE', 'ON_HOLD', 'CANCELED')),
  priority TEXT NOT NULL DEFAULT 'NONE' CHECK (priority IN ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration DECIMAL(8,2),
  is_billable BOOLEAN NOT NULL DEFAULT true,
  manually_added BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_division ON projects(division_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_crew ON tasks(crew_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client ON time_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_end ON time_entries(end_time);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_divisions_updated_at ON divisions;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Service role can do anything" ON users FOR ALL TO postgres WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can do anything" ON divisions FOR ALL TO postgres WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can do anything" ON clients FOR ALL TO postgres WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can do anything" ON projects FOR ALL TO postgres WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can do anything" ON tasks FOR ALL TO postgres WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can do anything" ON time_entries FOR ALL TO postgres WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role can do anything" ON tags FOR ALL TO postgres WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can read users" ON users FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can read divisions" ON divisions FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can read clients" ON clients FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can read projects" ON projects FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can read tasks" ON tasks FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can read time_entries" ON time_entries FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anon can read tags" ON tags FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

export function SetupPage() {
  const [step, setStep] = useState<SetupStep>('copy-sql');
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Use refs for values that must not trigger re-renders
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seedAttemptedRef = useRef(false);
  const mountedRef = useRef(false);

  // Seed helper — uses refs, never re-created
  const doSeed = useRef(async () => {
    if (seedAttemptedRef.current) return;
    seedAttemptedRef.current = true;
    setStep('seeding');
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setStep('done');
        toast.success('Database berhasil di-setup dengan data demo!');
        setTimeout(() => useAppStore.getState().setDbSetup(true), 2000);
      } else {
        setErrorMsg(json.error || 'Gagal mengisi data demo');
        setStep('error');
      }
    } catch {
      setErrorMsg('Tidak bisa terhubung ke server.');
      setStep('error');
    }
  });

  // Check if tables already exist on mount (once)
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const checkExisting = async () => {
      try {
        const res = await fetch('/api/setup');
        const json = await res.json();
        if (json.setup && json.hasData) {
          setStep('done');
          setTimeout(() => useAppStore.getState().setDbSetup(true), 1500);
        } else if (json.setup) {
          doSeed.current();
        }
      } catch {
        // ignore — tables don't exist yet
      }
    };
    checkExisting();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = () => {
    setStep('waiting-detection');
    setPollCount(0);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      setPollCount((prev) => prev + 1);
      try {
        const res = await fetch('/api/setup');
        const json = await res.json();
        if (json.setup) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (json.hasData) {
            setStep('done');
            setTimeout(() => useAppStore.getState().setDbSetup(true), 1500);
          } else {
            doSeed.current();
          }
        }
      } catch {
        // continue polling
      }
    }, 3000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_SQL);
      setCopied(true);
      toast.success('SQL berhasil disalin ke clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Gagal menyalin. Silakan copy manual.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([SETUP_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crewtracker-schema.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File SQL berhasil didownload!');
  };

  const handleRetry = () => {
    setErrorMsg('');
    seedAttemptedRef.current = false;
    setStep('copy-sql');
  };

  const handleManualCheck = async () => {
    try {
      const res = await fetch('/api/setup');
      const json = await res.json();
      if (json.setup) {
        if (json.hasData) {
          setStep('done');
          setTimeout(() => useAppStore.getState().setDbSetup(true), 1500);
        } else {
          doSeed.current();
        }
      } else {
        toast.error('Tabel belum terdeteksi. Pastikan SQL sudah di-run tanpa error.');
      }
    } catch {
      toast.error('Gagal mengecek status database.');
    }
  };

  // ─── Success Screen ────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <Card className="w-full max-w-md relative z-10 border-slate-700/50 bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="flex flex-col items-center gap-4 py-12 px-6">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Setup Berhasil!</h2>
              <p className="text-slate-500">Database siap dengan data demo. Mengalihkan ke halaman login...</p>
            </div>
            <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Setup Screen ─────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg relative z-10 border-slate-700/50 bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
            <Database className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Setup Database CrewTracker
          </CardTitle>
          <p className="text-slate-500 mt-1 text-sm">
            Ikuti 2 langkah mudah berikut untuk memulai
          </p>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          {/* ─── Step 1: Copy & Run SQL ─────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {step === 'waiting-detection' || step === 'seeding' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <h3 className="font-semibold text-slate-800">
                {step === 'waiting-detection' || step === 'seeding'
                  ? 'SQL sudah dijalankan'
                  : 'Jalankan SQL di Supabase SQL Editor'}
              </h3>
            </div>

            {step === 'copy-sql' && (
              <>
                <div className="ml-9 space-y-2">
                  <p className="text-sm text-slate-600">
                    Buka <strong>Supabase SQL Editor</strong>, paste SQL di bawah, lalu klik <strong>Run</strong>.
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-9"
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Tersalin!' : 'Copy SQL'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-9"
                      onClick={handleDownload}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Download .sql
                    </Button>
                  </div>

                  <a
                    href={SQL_EDITOR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-9 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka Supabase SQL Editor →
                  </a>
                </div>

                <div className="ml-9 relative">
                  <pre className="bg-slate-900 text-slate-300 text-[10px] leading-relaxed rounded-lg p-3 max-h-32 overflow-auto custom-scrollbar">
                    <code>{SETUP_SQL.substring(0, 400)}...</code>
                  </pre>
                </div>
              </>
            )}
          </div>

          {/* ─── Step 2: Verify & Seed ──────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                step === 'waiting-detection' || step === 'seeding'
                  ? 'bg-blue-600 text-white animate-pulse'
                  : step === 'done'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-600'
              )}>
                {step === 'done' ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <h3 className="font-semibold text-slate-800">
                {step === 'waiting-detection'
                  ? 'Menunggu tabel terdeteksi...'
                  : step === 'seeding'
                  ? 'Mengisi data demo...'
                  : 'Verifikasi & Isi Data Demo'}
              </h3>
            </div>

            {step === 'copy-sql' && (
              <div className="ml-9 space-y-2">
                <p className="text-sm text-slate-600">
                  Setelah SQL berhasil di-run, klik tombol di bawah untuk verifikasi dan mengisi data demo secara otomatis.
                </p>
                <Button
                  onClick={startPolling}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 px-6 gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Saya Sudah Run SQL — Lanjutkan
                </Button>
              </div>
            )}

            {/* Waiting / Detection State */}
            {step === 'waiting-detection' && (
              <div className="ml-9 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Mendeteksi tabel database...</p>
                    <p className="text-xs text-blue-500 mt-0.5">
                      Memeriksa setiap 3 detik (percobaan ke-{pollCount})
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Pastikan SQL sudah di-run di SQL Editor tanpa error (Success).
                  <br />
                  <button onClick={handleManualCheck} className="text-blue-600 hover:underline mt-1 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Cek sekarang
                  </button>
                </p>
              </div>
            )}

            {/* Seeding State */}
            {step === 'seeding' && (
              <div className="ml-9">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Mengisi data demo...</p>
                    <p className="text-xs text-emerald-500 mt-0.5">
                      Membuat divisi, pengguna, klien, proyek, dan time entries
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Error State ──────────────────────────── */}
          {step === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-semibold text-rose-800">Gagal mengisi data demo</p>
                  <p className="text-sm text-rose-700">{errorMsg}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-rose-200 text-rose-700 hover:bg-rose-100"
                      onClick={handleRetry}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Coba Lagi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={startPolling}
                    >
                      Cek Ulang Tabel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Info Footer ──────────────────────────── */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Data demo: 2 divisi, 8 pengguna, 4 klien, 4 proyek, 10 tugas, 50 time entries
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
