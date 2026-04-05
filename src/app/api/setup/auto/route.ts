import { NextRequest, NextResponse } from 'next/server'
import pg from 'pg'
import { supaQuery, hashPassword, generateId } from '@/lib/supabase'

const { Pool } = pg

interface ConnMethod {
  name: string
  buildUrl: (pw: string) => string
  options: Record<string, unknown>
}

const CONNECTION_METHODS: ConnMethod[] = [
  {
    name: 'Direct IPv4',
    buildUrl: (pw) =>
      `postgresql://postgres:${encodeURIComponent(pw)}@db.ussppownncyiniojqlgb.supabase.co:5432/postgres?sslmode=require`,
    options: { family: 4 },
  },
  {
    name: 'Session Pooler (port 5432)',
    buildUrl: (pw) =>
      `postgresql://postgres.ussppownncyiniojqlgb:${encodeURIComponent(pw)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`,
    options: {},
  },
  {
    name: 'Transaction Pooler (port 6543)',
    buildUrl: (pw) =>
      `postgresql://postgres.ussppownncyiniojqlgb:${encodeURIComponent(pw)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`,
    options: { prepare: false },
  },
  {
    name: 'Direct IPv6',
    buildUrl: (pw) =>
      `postgresql://postgres:${encodeURIComponent(pw)}@db.ussppownncyiniojqlgb.supabase.co:5432/postgres?sslmode=require`,
    options: { family: 6 },
  },
]

const SCHEMA_SQL = `
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

DO $$ BEGIN
  CREATE POLICY "Service role can do anything" ON users FOR ALL TO 'postgres' WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can do anything" ON divisions FOR ALL TO 'postgres' WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can do anything" ON clients FOR ALL TO 'postgres' WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can do anything" ON projects FOR ALL TO 'postgres' WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can do anything" ON tasks FOR ALL TO 'postgres' WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can do anything" ON time_entries FOR ALL TO 'postgres' WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can do anything" ON tags FOR ALL TO 'postgres' WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read users" ON users FOR SELECT TO 'anon' USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read divisions" ON divisions FOR SELECT TO 'anon' USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read clients" ON clients FOR SELECT TO 'anon' USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read projects" ON projects FOR SELECT TO 'anon' USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read tasks" ON tasks FOR SELECT TO 'anon' USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read time_entries" ON time_entries FOR SELECT TO 'anon' USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can read tags" ON tags FOR SELECT TO 'anon' USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`

async function tryConnect(
  method: ConnMethod,
  password: string,
  timeoutMs = 15000
): Promise<{ client: pg.PoolClient; method: ConnMethod } | { error: string }> {
  const connectionString = method.buildUrl(password)
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: timeoutMs,
    ssl: { rejectUnauthorized: false },
    ...method.options,
  })

  try {
    const client = await pool.connect()
    await client.query('SELECT 1 as test')
    return { client, method }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    try { await pool.end() } catch { /* ignore */ }
    return { error: errMsg }
  }
}

async function seedDemoData(): Promise<{
  users: number
  divisions: number
  clients: number
  projects: number
  tasks: number
  timeEntries: number
}> {
  // 1. Create Divisions (use temp captain IDs)
  const { data: divisions, error: divErr } = await supaQuery({
    table: 'divisions',
    body: [
      { name: 'Alpha Division', color: '#10b981', captain_id: 'temp-captain-1' },
      { name: 'Bravo Division', color: '#f59e0b', captain_id: 'temp-captain-2' },
    ],
    method: 'POST',
    headers: { Prefer: 'return=representation' },
  })

  if (divErr) throw new Error('Gagal membuat divisi: ' + divErr.message)

  const alphaDivId = divisions![0].id
  const bravoDivId = divisions![1].id

  // 2. Create Users
  const pwHash = await hashPassword('password123')

  const { data: users, error: userErr } = await supaQuery({
    table: 'users',
    body: [
      { email: 'admin@crewtracker.com', password: pwHash, name: 'Admin User', role: 'ADMIN', division_id: null },
      { email: 'captain1@crewtracker.com', password: pwHash, name: 'Captain Alpha', role: 'CAPTAIN', division_id: alphaDivId },
      { email: 'captain2@crewtracker.com', password: pwHash, name: 'Captain Bravo', role: 'CAPTAIN', division_id: bravoDivId },
      { email: 'crew1@crewtracker.com', password: pwHash, name: 'Crew Alex', role: 'CREW', division_id: alphaDivId },
      { email: 'crew2@crewtracker.com', password: pwHash, name: 'Crew Bella', role: 'CREW', division_id: alphaDivId },
      { email: 'crew3@crewtracker.com', password: pwHash, name: 'Crew Carlos', role: 'CREW', division_id: bravoDivId },
      { email: 'crew4@crewtracker.com', password: pwHash, name: 'Crew Diana', role: 'CREW', division_id: bravoDivId },
      { email: 'crew5@crewtracker.com', password: pwHash, name: 'Crew Evan', role: 'CREW', division_id: alphaDivId },
    ],
    method: 'POST',
    headers: { Prefer: 'return=representation' },
  })

  if (userErr) throw new Error('Gagal membuat users: ' + userErr.message)

  const captain1Id = users!.find((u: any) => u.email === 'captain1@crewtracker.com')!.id
  const captain2Id = users!.find((u: any) => u.email === 'captain2@crewtracker.com')!.id
  const crewIds = users!.filter((u: any) => u.role === 'CREW').map((u: any) => u.id)

  // Update division captains
  await supaQuery({ table: 'divisions', filterParams: { id: `eq.${alphaDivId}` }, body: { captain_id: captain1Id }, method: 'PATCH' })
  await supaQuery({ table: 'divisions', filterParams: { id: `eq.${bravoDivId}` }, body: { captain_id: captain2Id }, method: 'PATCH' })

  // 3. Create Clients
  const { data: clients, error: clientErr } = await supaQuery({
    table: 'clients',
    body: [
      { name: 'Acme Corp', email: 'contact@acme.com', division_id: alphaDivId, monthly_hours: 80, color: '#ef4444' },
      { name: 'Globex Inc', email: 'info@globex.com', division_id: alphaDivId, monthly_hours: 160, color: '#3b82f6' },
      { name: 'Initech', email: 'hello@initech.com', division_id: bravoDivId, monthly_hours: 120, color: '#8b5cf6' },
      { name: 'Umbrella Corp', email: 'ops@umbrella.com', division_id: bravoDivId, monthly_hours: 200, color: '#f59e0b' },
    ],
    method: 'POST',
    headers: { Prefer: 'return=representation' },
  })

  if (clientErr) throw new Error('Gagal membuat klien: ' + clientErr.message)

  const clientIds = clients!.map((c: any) => c.id)

  // 4. Create Projects
  const { data: projects, error: projErr } = await supaQuery({
    table: 'projects',
    body: [
      { name: 'Acme Website Redesign', client_id: clientIds[0], division_id: alphaDivId, color: '#ef4444', estimate_hours: 120 },
      { name: 'Globex Mobile App', client_id: clientIds[1], division_id: alphaDivId, color: '#3b82f6', estimate_hours: 200 },
      { name: 'Initech Cloud Migration', client_id: clientIds[2], division_id: bravoDivId, color: '#8b5cf6', estimate_hours: 150 },
      { name: 'Umbrella Security Audit', client_id: clientIds[3], division_id: bravoDivId, color: '#f59e0b', estimate_hours: 80 },
    ],
    method: 'POST',
    headers: { Prefer: 'return=representation' },
  })

  if (projErr) throw new Error('Gagal membuat project: ' + projErr.message)

  const projectIds = projects!.map((p: any) => p.id)

  // 5. Create Tasks
  const taskInputs = [
    { title: 'Design Homepage Layout', description: 'Create wireframes and mockups for the new homepage', project_id: projectIds[0], client_id: clientIds[0], crew_id: crewIds[0], status: 'ACTIVE', priority: 'HIGH', estimated_hours: 16 },
    { title: 'Develop API Endpoints', description: 'Build RESTful API for the mobile app backend', project_id: projectIds[1], client_id: clientIds[1], crew_id: crewIds[1], status: 'ACTIVE', priority: 'HIGH', estimated_hours: 40 },
    { title: 'Database Migration Plan', description: 'Plan and execute database migration to cloud', project_id: projectIds[2], client_id: clientIds[2], crew_id: crewIds[2], status: 'DONE', priority: 'URGENT', estimated_hours: 20 },
    { title: 'Security Assessment', description: 'Conduct thorough security audit of systems', project_id: projectIds[3], client_id: clientIds[3], crew_id: crewIds[3], status: 'ACTIVE', priority: 'URGENT', estimated_hours: 60 },
    { title: 'User Authentication Flow', description: 'Implement OAuth and JWT authentication', project_id: projectIds[0], client_id: clientIds[0], crew_id: crewIds[4], status: 'ACTIVE', priority: 'MEDIUM', estimated_hours: 24 },
    { title: 'Push Notifications', description: 'Set up push notification system for mobile', project_id: projectIds[1], client_id: clientIds[1], crew_id: crewIds[0], status: 'ON_HOLD', priority: 'LOW', estimated_hours: 12 },
    { title: 'Load Testing', description: 'Performance testing for cloud infrastructure', project_id: projectIds[2], client_id: clientIds[2], crew_id: crewIds[1], status: 'ACTIVE', priority: 'MEDIUM', estimated_hours: 16 },
    { title: 'Penetration Testing', description: 'Ethical hacking and vulnerability assessment', project_id: projectIds[3], client_id: clientIds[3], crew_id: crewIds[2], status: 'ACTIVE', priority: 'HIGH', estimated_hours: 40 },
    { title: 'Responsive Design', description: 'Make website fully responsive across devices', project_id: projectIds[0], client_id: clientIds[0], crew_id: crewIds[3], status: 'DONE', priority: 'MEDIUM', estimated_hours: 20 },
    { title: 'CI/CD Pipeline', description: 'Set up automated build and deploy pipeline', project_id: projectIds[2], client_id: clientIds[2], crew_id: crewIds[4], status: 'ACTIVE', priority: 'HIGH', estimated_hours: 32 },
  ]

  const { data: tasks, error: taskErr } = await supaQuery({
    table: 'tasks',
    body: taskInputs,
    method: 'POST',
    headers: { Prefer: 'return=representation' },
  })

  if (taskErr) throw new Error('Gagal membuat tugas: ' + taskErr.message)

  const taskIds = tasks!.map((t: any) => t.id)

  // 6. Create ~50 time entries over the last 30 days
  const descriptions = [
    'Working on frontend components',
    'Code review and testing',
    'Client meeting discussion',
    'Bug fixing and debugging',
    'Documentation updates',
    'API integration work',
    'Database optimization',
    'Sprint planning session',
    'Deploying to staging',
    'Performance improvements',
    'Refactoring legacy code',
    'Writing unit tests',
    'Design review meeting',
    'Infrastructure setup',
    'Security patch implementation',
  ]

  const timeEntries: any[] = []
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const hoursOffset = Math.floor(Math.random() * 8) + 8
    const startTime = new Date()
    startTime.setDate(startTime.getDate() - daysAgo)
    startTime.setHours(hoursOffset, Math.floor(Math.random() * 60), 0, 0)

    const durationHours = parseFloat((Math.random() * 4 + 0.5).toFixed(2))
    const endTime = new Date(startTime.getTime() + durationHours * 3600000)

    timeEntries.push({
      id: generateId(),
      user_id: crewIds[i % crewIds.length],
      project_id: projectIds[i % projectIds.length],
      client_id: clientIds[i % clientIds.length],
      task_id: taskIds[i % taskIds.length],
      description: descriptions[i % descriptions.length],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration: durationHours,
      is_billable: Math.random() > 0.2,
      manually_added: false,
    })
  }

  // Insert in batches of 10
  for (let i = 0; i < timeEntries.length; i += 10) {
    const batch = timeEntries.slice(i, i + 10)
    await supaQuery({ table: 'time_entries', body: batch, method: 'POST' })
  }

  return {
    users: users!.length,
    divisions: divisions!.length,
    clients: clients!.length,
    projects: projects!.length,
    tasks: tasks!.length,
    timeEntries: timeEntries.length,
  }
}

export async function POST(request: NextRequest) {
  const connectionLog: string[] = []

  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password database diperlukan.' },
        { status: 400 }
      )
    }

    // Try each connection method
    let connectedClient: pg.PoolClient | null = null
    let usedMethodName = ''

    for (const method of CONNECTION_METHODS) {
      connectionLog.push(`Mencoba ${method.name}...`)
      console.log(`[Auto Setup] Trying ${method.name}...`)

      const result = await tryConnect(method, password, 12000)
      if ('client' in result) {
        connectedClient = result.client
        usedMethodName = result.method.name
        connectionLog.push(`✅ Berhasil via ${usedMethodName}`)
        console.log(`[Auto Setup] Connected via ${usedMethodName}`)
        break
      } else {
        connectionLog.push(`❌ ${method.name}: ${result.error}`)
        console.log(`[Auto Setup] ${method.name} failed: ${result.error}`)
      }
    }

    if (!connectedClient) {
      console.error('[Auto Setup] All connection methods failed:', connectionLog)
      return NextResponse.json(
        {
          error: 'Tidak bisa terhubung ke database Supabase.',
          hint: 'Pastikan project Supabase aktif (tidak paused). Password database ada di: Supabase Dashboard → Settings → Database → Database password.',
          debugLog: connectionLog,
        },
        { status: 503 }
      )
    }

    // Execute schema
    connectionLog.push('Menjalankan schema SQL...')
    console.log('[Auto Setup] Executing schema SQL...')

    try {
      await connectedClient.query(SCHEMA_SQL)
      connectionLog.push('✅ Schema berhasil dijalankan')
      console.log('[Auto Setup] Schema executed successfully.')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      connectionLog.push(`❌ Schema error: ${errMsg}`)
      console.error('[Auto Setup] Schema error:', errMsg)
      // Don't release yet - try seeding anyway in case partial success
    } finally {
      connectedClient.release()
    }

    // Seed demo data using supaQuery
    connectionLog.push('Mengisi data demo...')
    console.log('[Auto Setup] Seeding demo data...')

    const stats = await seedDemoData()
    connectionLog.push(`✅ Data demo selesai: ${JSON.stringify(stats)}`)
    console.log('[Auto Setup] Seed data complete!')

    return NextResponse.json({
      success: true,
      message: 'Database berhasil di-setup otomatis!',
      connectedVia: usedMethodName,
      stats,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[Auto Setup] Error:', errMsg)

    if (errMsg.includes('password authentication failed') || errMsg.includes('auth failed')) {
      return NextResponse.json(
        {
          error: 'Password database salah.',
          hint: 'Cek password di: Supabase Dashboard → Settings → Database → Database password. Jika lupa, klik "Reset database password".',
          debugLog: connectionLog,
        },
        { status: 401 }
      )
    }

    if (errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT') || errMsg.includes('timeout')) {
      return NextResponse.json(
        {
          error: 'Tidak bisa terhubung ke server database.',
          hint: 'Pastikan project Supabase aktif (tidak dalam status paused). Project free tier otomatis pause setelah 7 hari tidak aktif.',
          debugLog: connectionLog,
        },
        { status: 503 }
      )
    }

    if (errMsg.includes('relation') || errMsg.includes('already exists') || errMsg.includes('duplicate')) {
      return NextResponse.json(
        {
          error: 'Sepertinya tabel sudah ada sebagian.',
          hint: 'Coba gunakan tab "Manual" → klik "Verifikasi & Seed Data Demo".',
          debugLog: connectionLog,
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Setup gagal: ' + errMsg, debugLog: connectionLog },
      { status: 500 }
    )
  }
}
