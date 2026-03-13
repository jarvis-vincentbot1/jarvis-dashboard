import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { executeRun } from '@/lib/runExecutor'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Fire and forget — execution persists even if client disconnects
  void executeRun(id)

  return NextResponse.json({ ok: true, status: 'running' })
}
