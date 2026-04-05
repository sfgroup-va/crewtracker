import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// GET: Reports data
// ?role=xxx&userId=xxx&divisionId=xxx&from=xxx&to=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'ADMIN'
    const userId = searchParams.get('userId')
    const divisionId = searchParams.get('divisionId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Default to current month if no dates provided
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const fromDate = from ? new Date(from) : defaultFrom
    const toDate = to ? new Date(to) : defaultTo

    // 1. Client utilization data
    const clientUtilization = await getClientUtilization(divisionId, fromDate, toDate)

    // 2. Crew productivity
    const crewProductivity = await getCrewProductivity(role, userId, divisionId, fromDate, toDate)

    // 3. Daily trend
    const dailyTrend = await getDailyTrend(role, userId, divisionId, fromDate, toDate)

    // 4. Summary stats
    const summary = await getSummaryStats(role, userId, divisionId, fromDate, toDate)

    return NextResponse.json({
      clientUtilization,
      crewProductivity,
      dailyTrend,
      summary,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

async function getClientUtilization(
  divisionId: string | null,
  from: Date,
  to: Date
) {
  const filterParams: Record<string, string> = {}
  if (divisionId) filterParams.division_id = `eq.${divisionId}`

  const { data: clients, error } = await supaQuery({
    table: 'clients',
    select: 'id, name, monthly_hours, color, division_id',
    filterParams: Object.keys(filterParams).length > 0 ? filterParams : undefined,
  })
  if (error || !clients) return []

  const result = await Promise.all(
    clients.map(async (client: any) => {
      const { data: entries } = await supaQuery({
        table: 'time_entries',
        select: 'duration',
        filterParams: {
          client_id: `eq.${client.id}`,
          end_time: `not.is.null`,
        },
        filter: `start_time=gte.${from.toISOString()}&start_time=lt.${to.toISOString()}`,
      })

      const usedHours = entries?.reduce((sum, e) => sum + (parseFloat(String((e as any).duration)) || 0), 0) || 0

      return {
        client_id: client.id,
        client_name: client.name,
        client_color: client.color,
        allocated_hours: client.monthly_hours,
        used_hours: Math.round(usedHours * 100) / 100,
        utilization_percent: client.monthly_hours > 0 ? Math.round((usedHours / client.monthly_hours) * 10000) / 100 : 0,
        remaining_hours: Math.max(0, Math.round((client.monthly_hours - usedHours) * 100) / 100),
      }
    })
  )

  return result
}

async function getCrewProductivity(
  role: string,
  userId: string | null,
  divisionId: string | null,
  from: Date,
  to: Date
) {
  const filterParams: Record<string, string> = {}
  if (role === 'CREW' && userId) {
    filterParams.id = `eq.${userId}`
  } else if (role === 'CAPTAIN' || divisionId) {
    filterParams.division_id = `eq.${divisionId}`
  }

  const { data: crew, error } = await supaQuery({
    table: 'users',
    select: 'id, name, email, role, avatar, division_id',
    filterParams: Object.keys(filterParams).length > 0 ? filterParams : undefined,
  })
  if (error || !crew) return []

  const result = await Promise.all(
    crew.map(async (member: any) => {
      const { data: entries } = await supaQuery({
        table: 'time_entries',
        select: 'duration, start_time, id',
        filterParams: {
          user_id: `eq.${member.id}`,
          end_time: `not.is.null`,
        },
        filter: `start_time=gte.${from.toISOString()}&start_time=lt.${to.toISOString()}`,
      })

      const totalHours = entries?.reduce((sum, e) => sum + (parseFloat(String((e as any).duration)) || 0), 0) || 0
      const entryCount = entries?.length || 0

      // Average hours per entry
      const avgPerEntry = entryCount > 0 ? Math.round((totalHours / entryCount) * 100) / 100 : 0

      return {
        user_id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        avatar: member.avatar,
        total_hours: Math.round(totalHours * 100) / 100,
        entry_count: entryCount,
        avg_hours_per_entry: avgPerEntry,
      }
    })
  )

  // Sort by total hours descending
  result.sort((a, b) => b.total_hours - a.total_hours)

  return result
}

async function getDailyTrend(
  role: string,
  userId: string | null,
  divisionId: string | null,
  from: Date,
  to: Date
) {
  const filterParams: Record<string, string> = {
    end_time: 'not.is.null',
  }

  let filterStr = `start_time=gte.${from.toISOString()}&start_time=lt.${to.toISOString()}`

  if (role === 'CREW' && userId) {
    filterParams.user_id = `eq.${userId}`
  } else if (divisionId) {
    const { data: divUsers } = await supaQuery({
      table: 'users',
      select: 'id',
      filterParams: { division_id: `eq.${divisionId}` },
    })
    if (divUsers && divUsers.length > 0) {
      filterParams.user_id = `in.(${divUsers.map((u: any) => u.id).join(',')})`
    }
  }

  const { data: entries, error } = await supaQuery({
    table: 'time_entries',
    select: 'duration, start_time, user_id',
    filterParams,
    filter: filterStr,
  })
  if (error || !entries) return []

  // Group by day
  const dayMap = new Map<string, number>()
  const dayCountMap = new Map<string, number>()

  for (const entry of entries) {
    const e = entry as any
    const day = new Date(e.start_time).toISOString().split('T')[0]
    const hours = parseFloat(String(e.duration)) || 0
    dayMap.set(day, (dayMap.get(day) || 0) + hours)
    dayCountMap.set(day, (dayCountMap.get(day) || 0) + 1)
  }

  // Generate all dates in range
  const trend: Array<{ date: string; total_hours: number; entry_count: number }> = []
  const current = new Date(from)
  while (current < to) {
    const dateStr = current.toISOString().split('T')[0]
    trend.push({
      date: dateStr,
      total_hours: Math.round((dayMap.get(dateStr) || 0) * 100) / 100,
      entry_count: dayCountMap.get(dateStr) || 0,
    })
    current.setDate(current.getDate() + 1)
  }

  return trend
}

async function getSummaryStats(
  role: string,
  userId: string | null,
  divisionId: string | null,
  from: Date,
  to: Date
) {
  const filterParams: Record<string, string> = {
    end_time: 'not.is.null',
  }

  let filterStr = `start_time=gte.${from.toISOString()}&start_time=lt.${to.toISOString()}`

  if (role === 'CREW' && userId) {
    filterParams.user_id = `eq.${userId}`
  } else if (divisionId) {
    const { data: divUsers } = await supaQuery({
      table: 'users',
      select: 'id',
      filterParams: { division_id: `eq.${divisionId}` },
    })
    if (divUsers && divUsers.length > 0) {
      filterParams.user_id = `in.(${divUsers.map((u: any) => u.id).join(',')})`
    }
  }

  const { data: entries, error } = await supaQuery({
    table: 'time_entries',
    select: 'duration, start_time, user_id, is_billable',
    filterParams,
    filter: filterStr,
  })
  if (error || !entries) {
    return {
      totalHours: 0,
      totalEntries: 0,
      billableHours: 0,
      nonBillableHours: 0,
      avgHoursPerDay: 0,
      uniqueDays: 0,
    }
  }

  const totalHours = entries.reduce((sum, e) => sum + (parseFloat(String((e as any).duration)) || 0), 0)
  const billableHours = entries.filter((e: any) => e.is_billable).reduce((sum, e) => sum + (parseFloat(String((e as any).duration)) || 0), 0)
  const uniqueDays = new Set(entries.map((e: any) => new Date(e.start_time).toISOString().split('T')[0])).size

  // Calculate days in range
  const daysInRange = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000))

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalEntries: entries.length,
    billableHours: Math.round(billableHours * 100) / 100,
    nonBillableHours: Math.round((totalHours - billableHours) * 100) / 100,
    avgHoursPerDay: Math.round((totalHours / uniqueDays) * 100) / 100,
    uniqueDays,
    daysInRange,
  }
}
