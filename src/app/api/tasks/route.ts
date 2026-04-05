import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Helper: enrich tasks with project, client, crew data via separate queries
async function enrichTasksWithRelations(tasks: any[]): Promise<any[]> {
  if (!tasks || tasks.length === 0) return tasks || []

  const projectIds = [...new Set(tasks.map((t: any) => t.project_id).filter(Boolean))]
  const clientIds = [...new Set(tasks.map((t: any) => t.client_id).filter(Boolean))]
  const crewIds = [...new Set(tasks.map((t: any) => t.crew_id).filter(Boolean))]

  const [projectsRes, clientsRes, usersRes] = await Promise.all([
    projectIds.length > 0
      ? supaQuery({ table: 'projects', select: 'id, name, color', filter: `id=in.(${projectIds.join(',')})` })
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? supaQuery({ table: 'clients', select: 'id, name, color', filter: `id=in.(${clientIds.join(',')})` })
      : Promise.resolve({ data: [] }),
    crewIds.length > 0
      ? supaQuery({ table: 'users', select: 'id, name, email, role', filter: `id=in.(${crewIds.join(',')})` })
      : Promise.resolve({ data: [] }),
  ])

  const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))
  const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]))
  const crewMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]))

  return tasks.map((task: any) => ({
    ...task,
    project: task.project_id ? projectMap.get(task.project_id) || null : null,
    client: task.client_id ? clientMap.get(task.client_id) || null : null,
    crew: task.crew_id ? crewMap.get(task.crew_id) || null : null,
  }))
}

// GET: List tasks with project name, client name, crew name, total logged hours
// Support filters: ?projectId, ?crewId, ?status, ?clientId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const crewId = searchParams.get('crewId')
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')

    const filterParams: Record<string, string> = {}
    if (projectId) filterParams.project_id = `eq.${projectId}`
    if (crewId) filterParams.crew_id = `eq.${crewId}`
    if (status) filterParams.status = `eq.${status}`
    if (clientId) filterParams.client_id = `eq.${clientId}`

    const { data, error } = await supaQuery({
      table: 'tasks',
      select: '*',
      filterParams: Object.keys(filterParams).length > 0 ? filterParams : undefined,
    })

    if (error) return handleTableError(error)
    if (!data) return NextResponse.json({ tasks: [] })

    // Enrich with relations via separate queries
    const enrichedWithRelations = await enrichTasksWithRelations(data)

    // Calculate total logged hours for each task
    const enriched = await Promise.all(
      enrichedWithRelations.map(async (task) => {
        const { data: entries } = await supaQuery({
          table: 'time_entries',
          select: 'duration',
          filterParams: {
            task_id: `eq.${task.id}`,
            end_time: `not.is.null`,
          },
        })

        const totalHours = entries?.reduce((sum, e) => sum + (parseFloat(String(e.duration)) || 0), 0) || 0

        return {
          ...task,
          total_logged_hours: Math.round(totalHours * 100) / 100,
        }
      })
    )

    return NextResponse.json({ tasks: enriched })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// POST: Create task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, project_id, client_id, crew_id, estimated_hours, status, priority, due_date } = body

    if (!title || !project_id || !client_id) {
      return NextResponse.json({ error: 'Title, project_id, and client_id are required' }, { status: 400 })
    }

    const { data, error } = await supaQuery({
      table: 'tasks',
      body: {
        title,
        description: description || null,
        project_id,
        client_id,
        crew_id: crew_id || null,
        estimated_hours: estimated_hours || null,
        status: status || 'ACTIVE',
        priority: priority || 'NONE',
        due_date: due_date || null,
      },
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ task: data![0] }, { status: 201 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// PUT: Update task
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 })
    }

    const { data, error } = await supaQuery({
      table: 'tasks',
      filterParams: { id: `eq.${id}` },
      body: updates,
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ task: data && data.length > 0 ? data[0] : null })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// DELETE: Delete task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 })
    }

    const { error } = await supaQuery({
      table: 'tasks',
      filterParams: { id: `eq.${id}` },
      method: 'DELETE',
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
