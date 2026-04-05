import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// GET: List projects with client name, division name, hours this month
export async function GET() {
  try {
    // Plain select — no embedded relationship
    const { data, error } = await supaQuery({
      table: 'projects',
      select: '*',
    })

    if (error) return handleTableError(error)
    if (!data) return NextResponse.json({ projects: [] })

    // Fetch clients and divisions separately for joining
    const clientIds = [...new Set(data.map((p: any) => p.client_id).filter(Boolean))]
    const divisionIds = [...new Set(data.map((p: any) => p.division_id).filter(Boolean))]

    const [clientsRes, divisionsRes] = await Promise.all([
      clientIds.length > 0
        ? supaQuery({ table: 'clients', select: 'id, name, email, color', filter: `id=in.(${clientIds.join(',')})` })
        : Promise.resolve({ data: [] }),
      divisionIds.length > 0
        ? supaQuery({ table: 'divisions', select: 'id, name, color', filter: `id=in.(${divisionIds.join(',')})` })
        : Promise.resolve({ data: [] }),
    ])

    const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]))
    const divisionMap = new Map((divisionsRes.data || []).map((d: any) => [d.id, d]))

    // Calculate hours this month for each project
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const enriched = await Promise.all(
      data.map(async (project) => {
        const { data: entries } = await supaQuery({
          table: 'time_entries',
          select: 'duration',
          filterParams: {
            project_id: `eq.${project.id}`,
            end_time: `not.is.null`,
          },
          filter: `start_time=gte.${monthStart.toISOString()}&start_time=lt.${monthEnd.toISOString()}`,
        })

        const hoursThisMonth = entries?.reduce((sum, e) => sum + (parseFloat(String(e.duration)) || 0), 0) || 0

        // Task count
        const { data: tasks } = await supaQuery({
          table: 'tasks',
          select: 'id',
          filterParams: { project_id: `eq.${project.id}` },
        })

        return {
          ...project,
          client: project.client_id ? clientMap.get(project.client_id) || null : null,
          division: project.division_id ? divisionMap.get(project.division_id) || null : null,
          hours_this_month: Math.round(hoursThisMonth * 100) / 100,
          task_count: tasks?.length || 0,
        }
      })
    )

    return NextResponse.json({ projects: enriched })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// POST: Create project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, client_id, division_id, color, estimate_hours, is_active } = body

    if (!name || !client_id || !division_id) {
      return NextResponse.json({ error: 'Name, client_id, and division_id are required' }, { status: 400 })
    }

    const { data, error } = await supaQuery({
      table: 'projects',
      body: {
        name,
        client_id,
        division_id,
        color: color || '#3b82f6',
        estimate_hours: estimate_hours || null,
        is_active: is_active !== undefined ? is_active : true,
      },
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ project: data![0] }, { status: 201 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// PUT: Update project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 })
    }

    const { data, error } = await supaQuery({
      table: 'projects',
      filterParams: { id: `eq.${id}` },
      body: updates,
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ project: data && data.length > 0 ? data[0] : null })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// DELETE: Delete project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 })
    }

    const { error } = await supaQuery({
      table: 'projects',
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
