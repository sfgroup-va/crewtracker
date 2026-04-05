import { NextRequest, NextResponse } from 'next/server'
import { supaQuery } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') 
      || new URL(request.url).searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

    const { data: users, error } = await supaQuery({
      table: 'users',
      select: 'id, name, email, role, avatar, division_id, created_at, updated_at',
      filterParams: { id: `eq.${token}` },
      limit: 1,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!users || users.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const user = users[0]
    if (user.division_id) {
      const { data: divs } = await supaQuery({
        table: 'divisions', select: 'id, name, color, captain_id',
        filterParams: { id: `eq.${user.division_id}` }, limit: 1,
      })
      if (divs && divs.length > 0) user.division = divs[0]
    }
    return NextResponse.json({ user })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
