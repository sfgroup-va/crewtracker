import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// GET: List all clients with division name, hours used this month
export async function GET() {
  try {
    // Plain select — no embedded relationship
    const { data, error } = await supaQuery({
      table: 'clients',
      select: '*',
    })

    if (error) return handleTableError(error)
    if (!data) return NextResponse.json({ clients: [] })

    // Fetch divisions separately for joining
    const divisionIds = [...new Set(data.map((c: any) => c.division_id).filter(Boolean))]
    let divisionMap = new Map<string, any>()
    if (divisionIds.length > 0) {
      const { data: divisions } = await supaQuery({
        table: 'divisions',
        select: 'id, name, color',
        filter: `id=in.(${divisionIds.join(',')})`,
      })
      divisionMap = new Map((divisions || []).map((d: any) => [d.id, d]))
    }

    // Calculate hours used this month for each client
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const enriched = await Promise.all(
      data.map(async (client) => {
        const { data: entriesFiltered } = await supaQuery({
          table: 'time_entries',
          select: 'duration',
          filterParams: {
            client_id: `eq.${client.id}`,
            end_time: `not.is.null`,
          },
          filter: `start_time=gte.${monthStart.toISOString()}&start_time=lt.${monthEnd.toISOString()}`,
        })

        const hoursUsed = entriesFiltered?.reduce((sum, e) => sum + (parseFloat(String(e.duration)) || 0), 0) || 0
        const utilization = client.monthly_hours > 0 ? (hoursUsed / client.monthly_hours) * 100 : 0

        return {
          ...client,
          division: client.division_id ? divisionMap.get(client.division_id) || null : null,
          hours_used_this_month: Math.round(hoursUsed * 100) / 100,
          utilization_percent: Math.round(utilization * 100) / 100,
        }
      })
    )

    return NextResponse.json({ clients: enriched })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// POST: Create client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, division_id, monthly_hours, hourly_rate, color } = body

    if (!name || !division_id) {
      return NextResponse.json({ error: 'Name and division_id are required' }, { status: 400 })
    }

    const { data, error } = await supaQuery({
      table: 'clients',
      body: {
        name,
        email: email || null,
        phone: phone || null,
        division_id,
        monthly_hours: monthly_hours || 160,
        hourly_rate: hourly_rate || null,
        color: color || '#6366f1',
      },
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ client: data![0] }, { status: 201 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// PUT: Update client
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 })
    }

    const { data, error } = await supaQuery({
      table: 'clients',
      filterParams: { id: `eq.${id}` },
      body: updates,
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ client: data && data.length > 0 ? data[0] : null })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// DELETE: Delete client
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Client id is required' }, { status: 400 })
    }

    const { error } = await supaQuery({
      table: 'clients',
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
