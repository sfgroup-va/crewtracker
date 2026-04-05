import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const { data: users, error } = await supaQuery({
      table: 'users',
      select: `id, name, email, role, avatar, division_id, created_at, updated_at, division:divisions(id, name, color, captain_id)`,
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

    return NextResponse.json({ user: users[0] })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
