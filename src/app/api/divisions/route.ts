import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// GET: List all divisions with captain name, member count, client count, project count
export async function GET() {
  try {
    // Plain select — no embedded relationship
    const { data, error } = await supaQuery({
      table: 'divisions',
      select: '*',
    })

    if (error) return handleTableError(error)
    if (!data) return NextResponse.json({ divisions: [] })

    // Fetch captains separately for joining
    const captainIds = [...new Set(data.map((d: any) => d.captain_id).filter(Boolean))]
    let captainMap = new Map<string, any>()
    if (captainIds.length > 0) {
      const { data: captains } = await supaQuery({
        table: 'users',
        select: 'id, name, email',
        filter: `id=in.(${captainIds.join(',')})`,
      })
      captainMap = new Map((captains || []).map((u: any) => [u.id, u]))
    }

    // Enrich with counts
    const enriched = await Promise.all(
      data.map(async (div) => {
        const [membersRes, clientsRes, projectsRes] = await Promise.all([
          supaQuery({ table: 'users', select: 'id', filterParams: { division_id: `eq.${div.id}` } }),
          supaQuery({ table: 'clients', select: 'id', filterParams: { division_id: `eq.${div.id}` } }),
          supaQuery({ table: 'projects', select: 'id', filterParams: { division_id: `eq.${div.id}` } }),
        ])

        return {
          ...div,
          captain: div.captain_id ? captainMap.get(div.captain_id) || null : null,
          memberCount: membersRes.data?.length || 0,
          clientCount: clientsRes.data?.length || 0,
          projectCount: projectsRes.data?.length || 0,
        }
      })
    )

    return NextResponse.json({ divisions: enriched })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// POST: Create division
export async function POST(request: NextRequest) {
  try {
    const { name, color, captainId } = await request.json()

    if (!name || !captainId) {
      return NextResponse.json({ error: 'Name and captainId are required' }, { status: 400 })
    }

    const { data, error } = await supaQuery({
      table: 'divisions',
      body: { name, color: color || '#10b981', captain_id: captainId },
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    // Update captain's division_id
    await supaQuery({
      table: 'users',
      filterParams: { id: `eq.${captainId}` },
      body: { division_id: data![0].id },
      method: 'PATCH',
    })

    return NextResponse.json({ division: data![0] }, { status: 201 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// PUT: Update division
export async function PUT(request: NextRequest) {
  try {
    const { id, name, color, captainId } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Division id is required' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (name) updates.name = name
    if (color) updates.color = color

    const { data, error } = await supaQuery({
      table: 'divisions',
      filterParams: { id: `eq.${id}` },
      body: updates,
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    if (captainId) {
      await supaQuery({
        table: 'users',
        filterParams: { id: `eq.${captainId}` },
        body: { division_id: id },
        method: 'PATCH',
      })
    }

    return NextResponse.json({ division: data && data.length > 0 ? data[0] : null })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// DELETE: Delete division
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Division id is required' }, { status: 400 })
    }

    // Set users' division_id to null before deleting
    await supaQuery({
      table: 'users',
      filterParams: { division_id: `eq.${id}` },
      body: { division_id: null },
      method: 'PATCH',
    })

    const { error } = await supaQuery({
      table: 'divisions',
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
