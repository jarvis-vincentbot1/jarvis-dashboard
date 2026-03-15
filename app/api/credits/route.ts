import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// GET /api/credits?days=30&source=openclaw
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30', 10)
  const source = searchParams.get('source') ?? 'openclaw'

  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  const sinceStr = since.toISOString().slice(0, 10)

  const credits = await prisma.credit.findMany({
    where: {
      source,
      date: { gte: sinceStr },
    },
    orderBy: { date: 'asc' },
  })

  // Aggregate totals
  let totalCost = 0
  const byDate: Record<string, { date: string; models: Record<string, number>; totalCost: number }> = {}
  const byModel: Record<string, number> = {}

  for (const c of credits) {
    totalCost += c.totalCost
    byModel[c.model] = (byModel[c.model] ?? 0) + c.totalCost

    if (!byDate[c.date]) byDate[c.date] = { date: c.date, models: {}, totalCost: 0 }
    byDate[c.date].models[c.model] = (byDate[c.date].models[c.model] ?? 0) + c.totalCost
    byDate[c.date].totalCost += c.totalCost
  }

  const daily = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    source,
    days,
    totalCost: Math.round(totalCost * 100000) / 100000,
    daily,
    models: byModel,
    cached_at: new Date().toISOString(),
  })
}
