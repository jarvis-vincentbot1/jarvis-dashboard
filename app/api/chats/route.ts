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

  const [standaloneRaw, projectsRaw] = await Promise.all([
    prisma.chat.findMany({
      where: { projectId: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { role: true, content: true, createdAt: true },
        },
      },
    }),
    prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        chats: {
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: { select: { messages: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { role: true, content: true, createdAt: true },
            },
          },
        },
      },
    }),
  ])

  const standalone = standaloneRaw.map(({ messages, ...c }) => ({
    ...c,
    lastMessage: messages[0] ?? null,
  }))

  const projects = projectsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    chats: p.chats.map(({ messages, ...c }) => ({
      ...c,
      lastMessage: messages[0] ?? null,
    })),
  }))

  return NextResponse.json({ standalone, projects })
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, projectId } = await request.json()

  const chat = await prisma.chat.create({
    data: {
      name: name?.trim() || 'New chat',
      projectId: projectId || null,
    },
  })

  return NextResponse.json(chat, { status: 201 })
}
