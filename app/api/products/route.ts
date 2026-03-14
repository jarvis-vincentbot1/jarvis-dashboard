import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, searchQuery, maxPrice } = body

  if (!name?.trim() || !searchQuery?.trim()) {
    return NextResponse.json({ error: 'name and searchQuery are required' }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      name: String(name).trim().slice(0, 100),
      searchQuery: String(searchQuery).trim().slice(0, 200),
      maxPrice: maxPrice ? Number(maxPrice) : null,
      category: 'gpu',
    },
  })

  return NextResponse.json({ product })
}
