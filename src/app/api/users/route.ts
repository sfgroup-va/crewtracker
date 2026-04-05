import { NextRequest, NextResponse } from 'next/server'
import { supaQuery, hashPassword, generateId } from '@/lib/supabase'

function handleTableError(error: { message: string; code?: string }) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// GET: List all users with role and division
// Filters: ?role, ?divisionId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const divisionId = searchParams.get('divisionId')

    const filterParams: Record<string, string> = {}
    if (role) filterParams.role = `eq.${role}`
    if (divisionId) filterParams.division_id = `eq.${divisionId}`

    const { data, error } = await supaQuery({
      table: 'users',
      select: `id, name, email, role, avatar, division_id, created_at, updated_at`,
      filterParams: Object.keys(filterParams).length > 0 ? filterParams : undefined,
      order: 'name.asc',
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ users: data || [] })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// POST: Create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, division_id, avatar } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    // Check for existing email
    const { data: existing } = await supaQuery({
      table: 'users',
      select: 'id',
      filterParams: { email: `eq.${email}` },
      limit: 1,
    })

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const validRoles = ['ADMIN', 'CAPTAIN', 'CREW']
    const userRole = validRoles.includes(role) ? role : 'CREW'

    const { data, error } = await supaQuery({
      table: 'users',
      body: {
        id: generateId(),
        email,
        password: hashedPassword,
        name,
        role: userRole,
        division_id: division_id || null,
        avatar: avatar || null,
      },
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ user: data && data.length > 0 ? data[0] : null }, { status: 201 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// PUT: Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, password, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 })
    }

    // If password is being updated, hash it
    if (password) {
      updates.password = await hashPassword(password)
    }

    const { data, error } = await supaQuery({
      table: 'users',
      filterParams: { id: `eq.${id}` },
      body: updates,
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
    })

    if (error) return handleTableError(error)

    return NextResponse.json({ user: data && data.length > 0 ? data[0] : null })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// DELETE: Delete user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 })
    }

    // Remove division captain reference if applicable
    const { data: divisions } = await supaQuery({
      table: 'divisions',
      select: 'id',
      filterParams: { captain_id: `eq.${id}` },
    })

    if (divisions && divisions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete user who is a division captain. Reassign captain first.' },
        { status: 409 }
      )
    }

    const { error } = await supaQuery({
      table: 'users',
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
