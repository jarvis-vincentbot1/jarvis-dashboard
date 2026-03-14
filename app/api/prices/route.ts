import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active products
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      prices: {
        orderBy: { scrapedAt: 'desc' },
      },
    },
  })

  // Return all entries sorted by price (ascending) — don't deduplicate, show every listing
  const result = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    searchQuery: product.searchQuery,
    maxPrice: product.maxPrice,
    entries: [...product.prices].sort((a, b) => a.price - b.price),
  }))

  return NextResponse.json({ products: result })
}
