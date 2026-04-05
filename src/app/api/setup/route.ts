import { NextResponse } from 'next/server'
import { supaQuery, hashPassword, generateId } from '@/lib/supabase'

// GET: Check if database tables exist and if data is seeded
export async function GET() {
  try {
    const { data, error } = await supaQuery({
      table: 'users',
      select: 'id',
      limit: 1,
    })

    if (error) {
      return NextResponse.json({
        setup: false,
        error: error.message,
      }, { status: 200 })
    }

    const hasData = data && data.length > 0

    return NextResponse.json({
      setup: true,
      hasData,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ setup: false, error: errMsg }, { status: 200 })
  }
}

// POST: Seed demo data (tables must already exist)
export async function POST() {
  try {
    // Verify tables exist first
    const { error: checkErr } = await supaQuery({
      table: 'users',
      select: 'id',
      limit: 1,
    })

    if (checkErr) {
      return NextResponse.json({
        error: 'Tabel belum dibuat di database.',
        hint: 'Buka Supabase Dashboard → SQL Editor → Copy-paste SQL → Run, lalu coba lagi.',
        details: checkErr.message,
      }, { status: 503 })
    }

    // Check if seed data already exists
    const { data: existingUsers } = await supaQuery({
      table: 'users',
      select: 'id',
      limit: 1,
    })

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Database sudah siap. Data demo sudah ada.',
        alreadySetup: true,
      })
    }

    // ---- SEED DATA ----
    console.log('Seeding demo data...')

    const pwHash = await hashPassword('password123')

    // 1. Create Admin + Captains first (no division FK needed for admin, captains need division later)
    const { data: usersStep1, error: user1Err } = await supaQuery({
      table: 'users',
      body: [
        { email: 'admin@crewtracker.com', password: pwHash, name: 'Admin User', role: 'ADMIN', division_id: null },
        { email: 'captain1@crewtracker.com', password: pwHash, name: 'Captain Alpha', role: 'CAPTAIN', division_id: null },
        { email: 'captain2@crewtracker.com', password: pwHash, name: 'Captain Bravo', role: 'CAPTAIN', division_id: null },
      ],
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (user1Err) {
      console.error('User step 1 insert error:', user1Err.message)
      return NextResponse.json({ error: 'Gagal membuat users: ' + user1Err.message }, { status: 500 })
    }

    const captain1Id = usersStep1!.find((u: any) => u.email === 'captain1@crewtracker.com')!.id
    const captain2Id = usersStep1!.find((u: any) => u.email === 'captain2@crewtracker.com')!.id

    // 2. Create Divisions with valid captain IDs
    const { data: divisions, error: divErr } = await supaQuery({
      table: 'divisions',
      body: [
        { name: 'Alpha Division', color: '#10b981', captain_id: captain1Id },
        { name: 'Bravo Division', color: '#f59e0b', captain_id: captain2Id },
      ],
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (divErr) {
      console.error('Division insert error:', divErr.message)
      return NextResponse.json({ error: 'Gagal membuat divisi: ' + divErr.message }, { status: 500 })
    }

    const alphaDivId = divisions![0].id
    const bravoDivId = divisions![1].id

    // 3. Update captains with their division
    await supaQuery({ table: 'users', filterParams: { id: `eq.${captain1Id}` }, body: { division_id: alphaDivId }, method: 'PATCH' })
    await supaQuery({ table: 'users', filterParams: { id: `eq.${captain2Id}` }, body: { division_id: bravoDivId }, method: 'PATCH' })

    // 4. Create Crew members
    const { data: crews, error: crewErr } = await supaQuery({
      table: 'users',
      body: [
        { email: 'crew1@crewtracker.com', password: pwHash, name: 'Crew Alex', role: 'CREW', division_id: alphaDivId },
        { email: 'crew2@crewtracker.com', password: pwHash, name: 'Crew Bella', role: 'CREW', division_id: alphaDivId },
        { email: 'crew3@crewtracker.com', password: pwHash, name: 'Crew Carlos', role: 'CREW', division_id: bravoDivId },
        { email: 'crew4@crewtracker.com', password: pwHash, name: 'Crew Diana', role: 'CREW', division_id: bravoDivId },
        { email: 'crew5@crewtracker.com', password: pwHash, name: 'Crew Evan', role: 'CREW', division_id: alphaDivId },
      ],
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (crewErr) {
      console.error('Crew insert error:', crewErr.message)
      return NextResponse.json({ error: 'Gagal membuat crew: ' + crewErr.message }, { status: 500 })
    }

    const crewIds = crews!.map((c: any) => c.id)
    const allUserIds = [...usersStep1!.map((u: any) => u.id), ...crewIds]

    // 5. Create Clients
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

    if (clientErr) {
      console.error('Client insert error:', clientErr.message)
      return NextResponse.json({ error: 'Gagal membuat klien: ' + clientErr.message }, { status: 500 })
    }

    const clientIds = clients!.map((c: any) => c.id)

    // 6. Create Projects
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

    if (projErr) {
      console.error('Project insert error:', projErr.message)
      return NextResponse.json({ error: 'Gagal membuat project: ' + projErr.message }, { status: 500 })
    }

    const projectIds = projects!.map((p: any) => p.id)

    // 7. Create Tasks
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

    if (taskErr) {
      console.error('Task insert error:', taskErr.message)
      return NextResponse.json({ error: 'Gagal membuat tugas: ' + taskErr.message }, { status: 500 })
    }

    const taskIds = tasks!.map((t: any) => t.id)

    // 8. Create ~50 time entries over the last 30 days
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
        user_id: allUserIds[i % allUserIds.length],
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

    console.log('Seed data complete!')

    return NextResponse.json({
      success: true,
      message: 'Database berhasil di-setup! Semua data demo sudah dibuat.',
      stats: {
        users: allUserIds.length,
        divisions: divisions!.length,
        clients: clients!.length,
        projects: projects!.length,
        tasks: tasks!.length,
        timeEntries: timeEntries.length,
      },
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('Setup error:', errMsg)
    return NextResponse.json({ error: 'Setup error: ' + errMsg }, { status: 500 })
  }
}
