import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  const { password } = await request.json()

  const correctPassword = process.env.DASHBOARD_PASSWORD
  if (!correctPassword) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const session = await getSession()
  session.isLoggedIn = true
  await session.save()

  return NextResponse.json({ success: true })
}
