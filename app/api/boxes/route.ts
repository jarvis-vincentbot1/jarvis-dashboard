import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const boxes = await prisma.box.findMany({
    include: {
      gpus: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, model: true, serialNumber: true, cost: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(boxes)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, destination, status, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const box = await prisma.box.create({
    data: {
      name: name.trim(),
      destination: destination?.trim() || null,
      status: status || 'Packing',
      notes: notes?.trim() || null,
    },
    include: { gpus: true },
  })

  return NextResponse.json(box, { status: 201 })
}
