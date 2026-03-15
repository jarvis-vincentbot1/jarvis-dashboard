import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const box = await prisma.box.findUnique({
    where: { id: params.id },
    include: { gpus: { orderBy: { createdAt: 'asc' } } },
  })

  if (!box) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(box)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, destination, status, notes } = body

  const box = await prisma.box.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(destination !== undefined && { destination: destination?.trim() || null }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
    include: {
      gpus: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, model: true, serialNumber: true, cost: true, status: true },
      },
    },
  })

  return NextResponse.json(box)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Unassign GPUs before deleting box
  await prisma.gPU.updateMany({
    where: { boxId: params.id },
    data: { boxId: null, status: 'In Stock' },
  })

  await prisma.box.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
