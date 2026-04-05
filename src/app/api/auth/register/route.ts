import { NextRequest, NextResponse } from 'next/server'
import { supaQuery, hashPassword, generateId } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    const validRoles = ['ADMIN', 'CAPTAIN', 'CREW']
    const userRole = validRoles.includes(role) ? role : 'CREW'

    // Check if user already exists
    const { data: existing, error: checkError } = await supaQuery({
      table: 'users',
      select: 'id',
      filterParams: { email: `eq.${email}` },
      limit: 1,
    })

    if (checkError) {
      if (checkError.message.includes('does not exist') || checkError.code === '42P01') {
        return NextResponse.json({ error: 'Database not set up. Please run setup first.' }, { status: 503 })
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const userId = generateId()

    const { data: user, error } = await supaQuery({
      table: 'users',
      body: {
        id: userId,
        email,
        password: hashedPassword,
        name,
        role: userRole,
      },
      method: 'POST',
      headers: { Prefer: 'return=representation' },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user || user.length === 0) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const { password: _pw, ...userWithoutPassword } = user[0]

    return NextResponse.json({
      user: userWithoutPassword,
      token: user[0].id,
    }, { status: 201 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
