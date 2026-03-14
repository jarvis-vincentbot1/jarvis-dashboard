import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://100.116.130.111:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

// ── Server-side cache (5 min TTL) ─────────────────────────────────────────────
interface CachedStatus {
  ts: number
  data: StatusResult
}

interface ModelHealth {
  ok: boolean
  latencyMs: number
  error?: string
}

interface StatusResult {
  openclaw: { online: boolean; latencyMs: number }
  haiku: ModelHealth
  sonnet: ModelHealth
  checkedAt: string
}

let cache: CachedStatus | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function testModel(model: string): Promise<ModelHealth> {
  if (!ANTHROPIC_API_KEY) return { ok: false, latencyMs: 0, error: 'No API key' }
  const start = Date.now()
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    const latencyMs = Date.now() - start
    const data = await res.json()
    if (data.type === 'error') {
      return { ok: false, latencyMs, error: data.error?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, latencyMs }
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: e instanceof Error ? e.message : 'timeout' }
  }
}

async function testOpenclaw(): Promise<{ online: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    const res = await fetch(`${OPENCLAW_API_URL}/v1/sessions`, {
      headers: { Authorization: `Bearer ${OPENCLAW_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    })
    return { online: res.ok, latencyMs: Date.now() - start }
  } catch {
    return { online: false, latencyMs: Date.now() - start }
  }
}

async function getStatus(): Promise<StatusResult> {
  // Return from cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data
  }

  // Run all checks in parallel
  const [openclaw, haiku, sonnet] = await Promise.all([
    testOpenclaw(),
    testModel('claude-haiku-4-5-20251001'),
    testModel('claude-sonnet-4-6'),
  ])

  const data: StatusResult = {
    openclaw,
    haiku,
    sonnet,
    checkedAt: new Date().toISOString(),
  }

  cache = { ts: Date.now(), data }
  return data
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await getStatus()
  return NextResponse.json(status)
}

// Allow force-refresh via POST
export async function POST() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  cache = null // invalidate cache
  const status = await getStatus()
  return NextResponse.json(status)
}
