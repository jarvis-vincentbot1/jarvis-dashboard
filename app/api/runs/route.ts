import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function GET() {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const runs = await prisma.run.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      steps: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json(runs)
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, model, steps } = await request.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ error: 'at least one step is required' }, { status: 400 })
  }

  const run = await prisma.run.create({
    data: {
      title: title.trim(),
      model: model || 'ollama/qwen2.5:7b',
      steps: {
        create: steps.map((s: { prompt: string; model?: string; requiresReview?: boolean }, i: number) => ({
          order: i,
          prompt: s.prompt,
          model: s.model || null,
          requiresReview: s.requiresReview ?? false,
        })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json(run, { status: 201 })
}
