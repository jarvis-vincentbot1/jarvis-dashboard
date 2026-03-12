import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://100.116.130.111:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(`${OPENCLAW_API_URL}/v1/sessions`, {
      headers: { Authorization: `Bearer ${OPENCLAW_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      return NextResponse.json(await res.json())
    }
  } catch {
    // Fall through to empty response
  }

  return NextResponse.json({ agents: [] })
}
