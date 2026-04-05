import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Plain select — no embedded relations to avoid "more than one relationship" errors
    const { data: users, error } = await supaQuery({
      table: 'users',
      select: 'id, name, email, role, avatar, division_id, created_at, updated_at',
      filterParams: { id: `eq.${token}` },
      limit: 1,
    })

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch division separately if user has one
    const user = users[0]
    if (user.division_id) {
      const { data: divisions } = await supaQuery({
        table: 'divisions',
        select: 'id, name, color, captain_id',
        filterParams: { id: `eq.${user.division_id}` },
        limit: 1,
      })
      if (divisions && divisions.length > 0) {
        user.division = divisions[0]
      }
    }

    return NextResponse.json({ user })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
