import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  try {
    const res = await fetch(
      `https://api.anthropic.com/v1/usage?start_date=${today}&end_date=${today}`,
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (res.ok) return NextResponse.json(await res.json())
  } catch {
    // Fall through
  }

  return NextResponse.json({ error: 'unavailable' })
}
