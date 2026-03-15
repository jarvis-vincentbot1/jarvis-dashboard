import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/credits/sync
// Accept: { totalCost, model, timeframe, timestamp }
// Called by Mac mini cron script to push OpenClaw session costs
export async function POST(req: NextRequest) {
  // Simple bearer token auth for cron script (uses CRON_SECRET env var)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { totalCost?: unknown; model?: unknown; timeframe?: unknown; timestamp?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { totalCost, model, timeframe, timestamp } = body

  if (typeof totalCost !== 'number' || totalCost < 0) {
    return NextResponse.json({ error: 'totalCost must be a non-negative number' }, { status: 400 })
  }
  if (typeof model !== 'string' || !model.trim()) {
    return NextResponse.json({ error: 'model is required' }, { status: 400 })
  }

  // timestamp should be YYYY-MM-DD or ISO string; default to today
  let date: string
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    date = timestamp
  } else if (typeof timestamp === 'string') {
    date = timestamp.slice(0, 10)
  } else {
    date = new Date().toISOString().slice(0, 10)
  }

  const tf = typeof timeframe === 'string' ? timeframe : 'daily'

  const credit = await prisma.credit.upsert({
    where: { date_model_source: { date, model: (model as string).trim(), source: 'openclaw' } },
    update: { totalCost, timeframe: tf, timestamp: new Date() },
    create: {
      date,
      model: (model as string).trim(),
      totalCost,
      timeframe: tf,
      source: 'openclaw',
    },
  })

  return NextResponse.json({ status: 'ok', saved: credit }, { status: 200 })
}
