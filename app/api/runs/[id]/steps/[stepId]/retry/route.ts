import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { executeRun } from '@/lib/runExecutor'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, stepId } = await params

  await prisma.runStep.update({
    where: { id: stepId },
    data: { status: 'pending', retries: 0, result: '' },
  })

  await prisma.run.update({
    where: { id },
    data: { status: 'pending' },
  })

  void executeRun(id)

  return NextResponse.json({ ok: true })
}
