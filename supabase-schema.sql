-- ============================================
-- CrewTracker - Database Schema for Supabase
-- Copy-paste ini ke: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (custom auth table)
-- ============================================
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

-- ============================================
-- TABLE: divisions
-- ============================================
CREATE TABLE IF NOT EXISTS divisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  captain_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add division_id FK (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_division'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_division
      FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- TABLE: clients
-- ============================================
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

-- ============================================
-- TABLE: projects (like Clockify projects)
-- ============================================
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

-- ============================================
-- TABLE: tags
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  division_id TEXT REFERENCES divisions(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: tasks
-- ============================================
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

-- ============================================
-- TABLE: time_entries (the core!)
-- ============================================
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

-- ============================================
-- INDEXES
-- ============================================
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

-- ============================================
-- updated_at trigger
-- ============================================
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

-- ============================================
-- Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — this is fine for our server-side API
CREATE POLICY "Service role can do anything" ON users FOR ALL TO 'postgres' WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON divisions FOR ALL TO 'postgres' WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON clients FOR ALL TO 'postgres' WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON projects FOR ALL TO 'postgres' WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON tasks FOR ALL TO 'postgres' WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON time_entries FOR ALL TO 'postgres' WITH CHECK (true);
CREATE POLICY "Service role can do anything" ON tags FOR ALL TO 'postgres' WITH CHECK (true);

-- Users can read their own data
CREATE POLICY "Users can read own" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own" ON users FOR UPDATE USING (auth.uid()::text = id);

-- Allow anon role for API access (our API uses service_role anyway)
CREATE POLICY "Anon can read users" ON users FOR SELECT TO 'anon' USING (true);
CREATE POLICY "Anon can read divisions" ON divisions FOR SELECT TO 'anon' USING (true);
CREATE POLICY "Anon can read clients" ON clients FOR SELECT TO 'anon' USING (true);
CREATE POLICY "Anon can read projects" ON projects FOR SELECT TO 'anon' USING (true);
CREATE POLICY "Anon can read tasks" ON tasks FOR SELECT TO 'anon' USING (true);
CREATE POLICY "Anon can read time_entries" ON time_entries FOR SELECT TO 'anon' USING (true);
CREATE POLICY "Anon can read tags" ON tags FOR SELECT TO 'anon' USING (true);

-- ============================================
-- DONE! All tables created.
-- ============================================
