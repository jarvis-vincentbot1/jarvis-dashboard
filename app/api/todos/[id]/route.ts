import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (typeof body.done === 'boolean') data.done = body.done
  if (typeof body.text === 'string' && body.text.trim()) data.text = body.text.trim()
  if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null

  const todo = await prisma.todo.update({ where: { id }, data })
  return NextResponse.json(todo)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.todo.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
