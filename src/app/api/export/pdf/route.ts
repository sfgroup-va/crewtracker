import { NextRequest, NextResponse } from 'next/server'
import { supaQuery, supaQueryHttps } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Helper: enrich time entries with task, project, client data
async function enrichEntriesWithRelations(entries: any[]): Promise<any[]> {
  if (!entries || entries.length === 0) return entries || []

  const taskIds = [...new Set(entries.map((e: any) => e.task_id).filter(Boolean))]
  const projectIds = [...new Set(entries.map((e: any) => e.project_id).filter(Boolean))]
  const clientIds = [...new Set(entries.map((e: any) => e.client_id).filter(Boolean))]

  const [tasksRes, projectsRes, clientsRes] = await Promise.all([
    taskIds.length > 0
      ? supaQueryHttps({ table: 'tasks', select: 'id, title', filter: `id=in.(${taskIds.join(',')})` })
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supaQueryHttps({ table: 'projects', select: 'id, name, color', filter: `id=in.(${projectIds.join(',')})` })
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? supaQueryHttps({ table: 'clients', select: 'id, name, color', filter: `id=in.(${clientIds.join(',')})` })
      : Promise.resolve({ data: [] }),
  ])

  const taskMap = new Map((tasksRes.data || []).map((t: any) => [t.id, t]))
  const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))
  const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]))

  return entries.map((entry: any) => ({
    ...entry,
    task: entry.task_id ? taskMap.get(entry.task_id) || null : null,
    project: entry.project_id ? projectMap.get(entry.project_id) || null : null,
    client: entry.client_id ? clientMap.get(entry.client_id) || null : null,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, fromDate, toDate } = body

    if (!userId || !fromDate || !toDate) {
      return NextResponse.json({ error: 'userId, fromDate, toDate are required' }, { status: 400 })
    }

    const from = new Date(fromDate)
    const to = new Date(toDate)

    // Fetch user info
    const { data: users, error: userError } = await supaQueryHttps({
      table: 'users',
      select: 'id, name, email, role, division_id',
      filterParams: { id: `eq.${userId}` },
      limit: 1,
    })
    if (userError) return handleTableError(userError)
    const user = users?.[0]
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Fetch division info
    let divisionName = '-'
    if (user.division_id) {
      const { data: divisions } = await supaQueryHttps({
        table: 'divisions',
        select: 'name',
        filterParams: { id: `eq.${user.division_id}` },
        limit: 1,
      })
      if (divisions && divisions.length > 0) {
        divisionName = divisions[0].name
      }
    }

    // Fetch completed time entries in date range
    const { data: entries, error: entriesError } = await supaQueryHttps({
      table: 'time_entries',
      select: '*',
      filterParams: {
        user_id: `eq.${userId}`,
        end_time: 'not.is.null',
      },
      filter: `start_time=gte.${from.toISOString()}&start_time=lt.${to.toISOString()}`,
      order: 'start_time.asc',
    })
    if (entriesError) return handleTableError(entriesError)

    // Enrich entries
    const enrichedEntries = await enrichEntriesWithRelations(entries || [])

    // Generate PDF
    const { generatePdf } = await import('@/lib/pdf-generator')
    const pdfBuffer = await generatePdf({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        division: divisionName,
      },
      entries: enrichedEntries,
      fromDate: from,
      toDate: to,
    })

    // Return PDF
    const filename = `Laporan_Jam_Kerja_${user.name.replace(/\s+/g, '_')}_${fromDate}_${toDate}.pdf`
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('PDF generation error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
