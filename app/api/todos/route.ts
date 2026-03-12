import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function GET(request: Request) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  const todos = await prisma.todo.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: [
      { done: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return NextResponse.json(todos)
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, projectId, dueDate } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 })

  const todo = await prisma.todo.create({
    data: {
      text: text.trim(),
      projectId: projectId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  })

  return NextResponse.json(todo, { status: 201 })
}
