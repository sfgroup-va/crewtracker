import { NextRequest, NextResponse } from 'next/server'
import { supaQuery, hashPassword, generateId } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()
    if (!email || !password || !name) return NextResponse.json({ error: 'Email, password, name wajib' }, { status: 400 })

    const existing = await supaQuery({ table: 'users', select: 'id', filterParams: { email: `eq.${email}` }, limit: 1 })
    if (existing.data && existing.data.length > 0) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })

    const hashedPw = await hashPassword(password)
    const id = generateId()
    const now = new Date().toISOString()

    const { data, error } = await supaQuery({
      table: 'users', body: { id, email, password: hashedPw, name, role: role || 'CREW', created_at: now, updated_at: now },
      method: 'POST', headers: { Prefer: 'return=representation' },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { password: _pw, ...user } = (data as any[])[0]
    return NextResponse.json({ user, token: user.id }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
