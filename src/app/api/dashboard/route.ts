import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

async function sumHoursForPeriod(
  userId?: string,
  divisionId?: string,
  from: Date,
  to: Date
): Promise<number> {
  const filterParams: Record<string, string> = {
    end_time: 'not.is.null',
  }

  let filterStr = `start_time=gte.${from.toISOString()}&start_time=lt.${to.toISOString()}`

  if (userId) {
    filterParams.user_id = `eq.${userId}`
  }

  if (divisionId) {
    // Get all users in division
    const { data: divUsers } = await supaQuery({
      table: 'users',
      select: 'id',
      filterParams: { division_id: `eq.${divisionId}` },
    })
    if (divUsers && divUsers.length > 0) {
      const userIds = divUsers.map((u: any) => u.id)
      filterParams.user_id = `in.(${userIds.join(',')})`
    } else {
      return 0
    }
  }

  const { data, error } = await supaQuery({
    table: 'time_entries',
    select: 'duration',
    filterParams,
    filter: filterStr,
  })
  if (error || !data) return 0

  return data.reduce((sum, e) => sum + (parseFloat(String((e as any).duration)) || 0), 0)
}

async function getActiveTimerCount(divisionId?: string): Promise<number> {
  const filterParams: Record<string, string> = {
    end_time: 'is.null',
  }

  if (divisionId) {
    const { data: divUsers } = await supaQuery({
      table: 'users',
      select: 'id',
      filterParams: { division_id: `eq.${divisionId}` },
    })
    if (divUsers && divUsers.length > 0) {
      const userIds = divUsers.map((u: any) => u.id)
      filterParams.user_id = `in.(${userIds.join(',')})`
    } else {
      return 0
    }
  }

  const { data, error } = await supaQuery({
    table: 'time_entries',
    select: 'id',
    filterParams,
  })
  if (error) return 0
  return data?.length || 0
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

// GET: Role-based dashboard stats
// ?role=xxx&userId=xxx&divisionId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const userId = searchParams.get('userId')
    const divisionId = searchParams.get('divisionId')

    if (!role || !userId) {
      return NextResponse.json({ error: 'role and userId are required' }, { status: 400 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    if (role === 'ADMIN') {
      return await getAdminDashboard(userId, divisionId, todayStart, weekStart, monthStart, monthEnd)
    }

    if (role === 'CAPTAIN') {
      return await getCaptainDashboard(userId, divisionId, todayStart, weekStart, monthStart, monthEnd)
    }

    // CREW
    return await getCrewDashboard(userId, todayStart, weekStart, monthStart, monthEnd)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

async function getAdminDashboard(
  _userId: string,
  divisionId: string | null,
  todayStart: Date,
  _weekStart: Date,
  monthStart: Date,
  monthEnd: Date
) {
  // Total counts
  const [clientsRes, projectsRes, crewRes] = await Promise.all([
    supaQuery({ table: 'clients', select: 'id' }),
    supaQuery({ table: 'projects', select: 'id', filterParams: { is_active: 'eq.true' } }),
    supaQuery({ table: 'users', select: 'id', filterParams: { role: 'eq.CREW' } }),
  ])

  const totalClients = clientsRes.data?.length || 0
  const totalProjects = projectsRes.data?.length || 0
  const totalCrew = crewRes.data?.length || 0

  const hoursThisMonth = await sumHoursForPeriod(undefined, divisionId || undefined, monthStart, monthEnd)
  const activeTimers = await getActiveTimerCount(divisionId || undefined)

  // Avg utilization: hoursThisMonth / (totalCrew * workingDaysThisMonth * 8)
  const workingDays = Math.min(
    new Date().getDate(),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  )
  const availableHours = totalCrew * workingDays * 8
  const avgUtilization = availableHours > 0 ? Math.round((hoursThisMonth / availableHours) * 100) : 0

  // Recent tasks - plain select, then join separately
  const { data: recentTasks } = await supaQuery({
    table: 'tasks',
    select: '*',
    filterParams: { status: 'neq.DONE' },
    order: 'created_at.desc',
    limit: 10,
  })

  const enrichedRecentTasks = await enrichTasksWithRelations(recentTasks || [])

  // Division breakdown
  const { data: divisions } = await supaQuery({
    table: 'divisions',
    select: 'id, name, color',
  })

  const divisionStats = await Promise.all(
    (divisions || []).map(async (div: any) => {
      const divHours = await sumHoursForPeriod(undefined, div.id, monthStart, monthEnd)
      const { data: divCrew } = await supaQuery({
        table: 'users',
        select: 'id',
        filterParams: { division_id: `eq.${div.id}` },
      })
      return {
        ...div,
        hours_this_month: Math.round(divHours * 100) / 100,
        crew_count: divCrew?.length || 0,
      }
    })
  )

  return NextResponse.json({
    stats: {
      totalClients,
      totalProjects,
      totalCrew,
      hoursThisMonth: Math.round(hoursThisMonth * 100) / 100,
      avgUtilization,
      activeTimers,
    },
    recentTasks: enrichedRecentTasks,
    divisionStats,
  })
}

async function getCaptainDashboard(
  userId: string,
  divisionId: string | null,
  todayStart: Date,
  weekStart: Date,
  monthStart: Date,
  monthEnd: Date
) {
  // Get captain's division
  if (!divisionId) {
    const { data: userData } = await supaQuery({
      table: 'users',
      select: 'division_id',
      filterParams: { id: `eq.${userId}` },
      limit: 1,
    })
    divisionId = userData?.[0]?.division_id
  }

  // Division stats
  const [clientsRes, projectsRes, crewRes] = await Promise.all([
    supaQuery({ table: 'clients', select: 'id', filterParams: { division_id: `eq.${divisionId}` } }),
    supaQuery({ table: 'projects', select: 'id', filterParams: { division_id: `eq.${divisionId}` } }),
    supaQuery({ table: 'users', select: 'id, name, email, avatar', filterParams: { division_id: `eq.${divisionId}` } }),
  ])

  const hoursThisMonth = await sumHoursForPeriod(undefined, divisionId || undefined, monthStart, monthEnd)
  const activeTimers = await getActiveTimerCount(divisionId || undefined)

  // Crew list with hours today + active timer status
  const crewList = await Promise.all(
    (crewRes.data || []).map(async (crew: any) => {
      const hoursToday = await sumHoursForPeriod(crew.id, undefined, todayStart, new Date(todayStart.getTime() + 86400000))
      const { data: activeTimer } = await supaQuery({
        table: 'time_entries',
        select: 'id, task_id, description, start_time',
        filterParams: {
          user_id: `eq.${crew.id}`,
          end_time: `is.null`,
        },
        limit: 1,
      })
      const weekHours = await sumHoursForPeriod(crew.id, undefined, weekStart, new Date())
      return {
        ...crew,
        hours_today: Math.round(hoursToday * 100) / 100,
        hours_week: Math.round(weekHours * 100) / 100,
        has_active_timer: (activeTimer && activeTimer.length > 0) || false,
        active_timer: activeTimer && activeTimer.length > 0 ? activeTimer[0] : null,
      }
    })
  )

  // Recent tasks in division - plain select, then join separately
  const { data: recentTasks } = await supaQuery({
    table: 'tasks',
    select: '*',
    filterParams: { status: 'neq.DONE' },
    order: 'created_at.desc',
    limit: 10,
  })

  const enrichedRecentTasks = await enrichTasksWithRelations(recentTasks || [])

  // Filter tasks by division's projects
  const { data: divProjects } = await supaQuery({
    table: 'projects',
    select: 'id',
    filterParams: { division_id: `eq.${divisionId}` },
  })
  const divProjectIds = new Set((divProjects || []).map((p: any) => p.id))
  const filteredTasks = enrichedRecentTasks.filter((t: any) => divProjectIds.has(t.project_id))

  return NextResponse.json({
    stats: {
      totalClients: clientsRes.data?.length || 0,
      totalProjects: projectsRes.data?.length || 0,
      totalCrew: crewRes.data?.length || 0,
      hoursThisMonth: Math.round(hoursThisMonth * 100) / 100,
      activeTimers,
    },
    crewList,
    recentTasks: filteredTasks,
  })
}

async function getCrewDashboard(
  userId: string,
  todayStart: Date,
  weekStart: Date,
  monthStart: Date,
  monthEnd: Date
) {
  const todayEnd = new Date(todayStart.getTime() + 86400000)

  const [hoursToday, hoursWeek, hoursMonth] = await Promise.all([
    sumHoursForPeriod(userId, undefined, todayStart, todayEnd),
    sumHoursForPeriod(userId, undefined, weekStart, new Date()),
    sumHoursForPeriod(userId, undefined, monthStart, monthEnd),
  ])

  // Active timer - plain select, then join separately
  const { data: activeTimerData } = await supaQuery({
    table: 'time_entries',
    select: '*',
    filterParams: {
      user_id: `eq.${userId}`,
      end_time: `is.null`,
    },
    limit: 1,
  })

  const enrichedActiveTimer = await enrichEntriesWithRelations(activeTimerData || [])
  const activeTimer = enrichedActiveTimer.length > 0 ? enrichedActiveTimer[0] : null

  // Recent entries - plain select, then join separately
  const { data: recentEntriesData } = await supaQuery({
    table: 'time_entries',
    select: '*',
    filterParams: {
      user_id: `eq.${userId}`,
      end_time: `not.is.null`,
    },
    order: 'start_time.desc',
    limit: 10,
  })

  const recentEntries = await enrichEntriesWithRelations(recentEntriesData || [])

  // My tasks - plain select, then join separately
  const { data: myTasksData } = await supaQuery({
    table: 'tasks',
    select: '*',
    filterParams: { crew_id: `eq.${userId}` },
    order: 'updated_at.desc',
    limit: 20,
  })

  const enrichedTasks = await enrichTasksWithRelations(myTasksData || [])

  // Enrich tasks with logged hours
  const tasksWithHours = await Promise.all(
    enrichedTasks.map(async (task: any) => {
      const { data: entries } = await supaQuery({
        table: 'time_entries',
        select: 'duration',
        filterParams: {
          task_id: `eq.${task.id}`,
          user_id: `eq.${userId}`,
          end_time: `not.is.null`,
        },
      })
      const totalHours = entries?.reduce((sum, e) => sum + (parseFloat(String((e as any).duration)) || 0), 0) || 0
      return { ...task, my_logged_hours: Math.round(totalHours * 100) / 100 }
    })
  )

  return NextResponse.json({
    stats: {
      hoursToday: Math.round(hoursToday * 100) / 100,
      hoursWeek: Math.round(hoursWeek * 100) / 100,
      hoursMonth: Math.round(hoursMonth * 100) / 100,
      hasActiveTimer: !!activeTimer,
      activeTimer,
    },
    recentEntries,
    myTasks: tasksWithHours,
  })
}
