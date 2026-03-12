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

  // For each product, get the latest entry per retailer
  const result = products.map((product) => {
    const latestByRetailer = new Map<string, typeof product.prices[number]>()
    for (const entry of product.prices) {
      const key = `${entry.retailer}::${entry.country}`
      if (!latestByRetailer.has(key)) {
        latestByRetailer.set(key, entry)
      }
    }

    const entries = Array.from(latestByRetailer.values()).sort((a, b) => a.price - b.price)

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      entries,
    }
  })

  return NextResponse.json({ products: result })
}
