import { NextRequest, NextResponse } from 'next/server'
import { supaQuery, generateId } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Helper: enrich time entries with task, project, client data via separate queries
async function enrichEntriesWithRelations(entries: any[]): Promise<any[]> {
  if (!entries || entries.length === 0) return entries || []

  const taskIds = [...new Set(entries.map((e: any) => e.task_id).filter(Boolean))]
  const projectIds = [...new Set(entries.map((e: any) => e.project_id).filter(Boolean))]
  const clientIds = [...new Set(entries.map((e: any) => e.client_id).filter(Boolean))]

  const [tasksRes, projectsRes, clientsRes] = await Promise.all([
    taskIds.length > 0
      ? supaQuery({ table: 'tasks', select: 'id, title', filter: `id=in.(${taskIds.join(',')})` })
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supaQuery({ table: 'projects', select: 'id, name, color', filter: `id=in.(${projectIds.join(',')})` })
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? supaQuery({ table: 'clients', select: 'id, name, color', filter: `id=in.(${clientIds.join(',')})` })
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

// POST: Start timer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, crewId, clientId, projectId, description } = body

    if (!crewId || !clientId) {
      return NextResponse.json({ error: 'crewId and clientId are required' }, { status: 400 })
    }

    // Check if crew already has an active timer
    const { data: activeTimers } = await supaQuery({
      table: 'time_entries',
      select: 'id',
      filterParams: {
        user_id: `eq.${crewId}`,
        end_time: `is.null`,
      },
      limit: 1,
    })

    if (activeTimers && activeTimers.length > 0) {
      return NextResponse.json({ error: 'You already have an active timer. Stop it first.' }, { status: 409 })
    }

    const entryId = generateId()
    const now = new Date().toISOString()

    const { data, error } = await supaQuery({
      table: 'time_entries',
      body: {
        id: entryId,
        user_id: crewId,
        project_id: projectId || null,
        client_id: clientId,
        task_id: taskId || null,
        description: description || null,
        start_time: now,
        end_time: null,
        duration: null,
      },
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ entry: data![0] }, { status: 201 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// PUT: Stop timer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entryId, description } = body

    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
    }

    // Get the entry to calculate duration
    const { data: entries, error: fetchError } = await supaQuery({
      table: 'time_entries',
      select: '*',
      filterParams: { id: `eq.${entryId}` },
      limit: 1,
    })

    if (fetchError) return handleTableError(fetchError)
    const entry = entries?.[0]
    if (!entry) return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    if (entry.end_time) return NextResponse.json({ error: 'Timer already stopped' }, { status: 400 })

    const endTime = new Date()
    const startTime = new Date(entry.start_time)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationHours = Math.round((durationMs / 3600000) * 100) / 100

    const updates: Record<string, unknown> = {
      end_time: endTime.toISOString(),
      duration: durationHours,
    }
    if (description !== undefined) updates.description = description

    const { data, error } = await supaQuery({
      table: 'time_entries',
      filterParams: { id: `eq.${entryId}` },
      body: updates,
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ entry: data && data.length > 0 ? data[0] : null })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// GET: Get timer data
// ?crewId=xxx&active=true — get active timer for crew
// ?crewId=xxx&from=xxx&to=xxx — get time entries with date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crewId = searchParams.get('crewId')
    const active = searchParams.get('active')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!crewId) {
      return NextResponse.json({ error: 'crewId is required' }, { status: 400 })
    }

    if (active === 'true') {
      // Get active timer - plain select, then join separately
      const { data, error } = await supaQuery({
        table: 'time_entries',
        select: '*',
        filterParams: {
          user_id: `eq.${crewId}`,
          end_time: `is.null`,
        },
        limit: 1,
      })

      if (error) return handleTableError(error)

      const rawEntries = data || []
      const enrichedEntries = await enrichEntriesWithRelations(rawEntries)
      const activeEntry = enrichedEntries.length > 0 ? enrichedEntries[0] : null

      // Calculate elapsed time for active timer
      if (activeEntry) {
        const startTime = new Date(activeEntry.start_time)
        const now = new Date()
        const elapsedMs = now.getTime() - startTime.getTime()
        activeEntry.elapsed_seconds = Math.round(elapsedMs / 1000)
      }

      return NextResponse.json({ activeTimer: activeEntry })
    }

    if (from && to) {
      // Get time entries with date range - plain select, then join separately
      const { data, error } = await supaQuery({
        table: 'time_entries',
        select: '*',
        filterParams: {
          user_id: `eq.${crewId}`,
        },
        filter: `start_time=gte.${from}&start_time=lt.${to}`,
        order: 'start_time.desc',
      })

      if (error) return handleTableError(error)

      const enrichedEntries = await enrichEntriesWithRelations(data || [])
      return NextResponse.json({ entries: enrichedEntries })
    }

    // Default: get recent entries (last 7 days) - plain select, then join separately
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data, error } = await supaQuery({
      table: 'time_entries',
      select: '*',
      filterParams: {
        user_id: `eq.${crewId}`,
      },
      filter: `start_time=gte.${sevenDaysAgo.toISOString()}`,
      order: 'start_time.desc',
    })

    if (error) return handleTableError(error)

    const enrichedEntries = await enrichEntriesWithRelations(data || [])
    return NextResponse.json({ entries: enrichedEntries })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
