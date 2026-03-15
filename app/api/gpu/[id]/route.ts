import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { model, supplier, serialNumber, purchaseDate, cost, status, boxId, notes } = body

  const gpu = await prisma.gPU.update({
    where: { id: params.id },
    data: {
      ...(model !== undefined && { model: model.trim() }),
      ...(supplier !== undefined && { supplier: supplier.trim() }),
      ...(serialNumber !== undefined && { serialNumber: serialNumber.trim() }),
      ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
      ...(cost !== undefined && { cost: cost !== null && cost !== '' ? parseFloat(cost) : null }),
      ...(status !== undefined && { status }),
      ...(boxId !== undefined && { boxId: boxId || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
    include: { box: { select: { id: true, name: true } } },
  })

  return NextResponse.json(gpu)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.gPU.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
