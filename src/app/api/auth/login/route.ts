import { NextRequest, NextResponse } from 'next/server'
import { supaQuery, verifyPassword } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { data: users, error } = await supaQuery({
      table: 'users',
      select: '*',
      filterParams: { email: `eq.${email}` },
      limit: 1,
    })

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ error: 'Database not set up.' }, { status: 503 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    const user = users[0]
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    const { password: _pw, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      token: user.id,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
