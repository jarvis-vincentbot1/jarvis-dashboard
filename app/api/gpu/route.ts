import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function GET(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const gpus = await prisma.gPU.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { supplier: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: { box: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(gpus)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { model, supplier, serialNumber, purchaseDate, cost, status, notes } = body

  if (!model?.trim()) return NextResponse.json({ error: 'model required' }, { status: 400 })
  if (!supplier?.trim()) return NextResponse.json({ error: 'supplier required' }, { status: 400 })
  if (!serialNumber?.trim()) return NextResponse.json({ error: 'serialNumber required' }, { status: 400 })

  const gpu = await prisma.gPU.create({
    data: {
      model: model.trim(),
      supplier: supplier.trim(),
      serialNumber: serialNumber.trim(),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      cost: cost !== undefined && cost !== '' ? parseFloat(cost) : null,
      status: status || 'In Stock',
      notes: notes?.trim() || null,
    },
    include: { box: { select: { id: true, name: true } } },
  })

  return NextResponse.json(gpu, { status: 201 })
}
