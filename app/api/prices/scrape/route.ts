// POST /api/prices/scrape
// Modes:
//   1. Internal scrape (no body / body with productId) → runs lib/scraper.ts
//   2. External data push (body with { productId, entries: [...] }) → saves prices directly
//
// Auth: X-Cron-Secret header must match CRON_SECRET env var

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeHardwarePrices, scrapeAllProducts } from '@/lib/scraper'

interface PriceEntry {
  retailer: string
  country: string
  price: number
  currency: string
  inStock: boolean
  url: string
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET ?? 'jarvis-cron'

  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { productId?: string; entries?: PriceEntry[] } = {}
  try {
    const text = await req.text()
    if (text) body = JSON.parse(text)
  } catch { /* empty body = scrape all */ }

  const productId = body.productId

  if (body.entries && Array.isArray(body.entries) && body.entries.length > 0) {
    // External scraper pushing data for a specific product
    if (!productId) {
      return NextResponse.json({ error: 'productId required with entries' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    console.log(`[Scrape] Received ${body.entries.length} prices for "${product.name}"`)

    await prisma.priceEntry.deleteMany({ where: { productId } })

    let saved = 0
    for (const e of body.entries) {
      if (!e.retailer || !e.price || e.price < 10) continue
      if (product?.maxPrice && e.price > product.maxPrice) continue
      await prisma.priceEntry.create({
        data: {
          productId,
          retailer: String(e.retailer).slice(0, 50),
          country: String(e.country || 'EU').slice(0, 10),
          price: Number(e.price),
          currency: String(e.currency || 'EUR').slice(0, 5),
          inStock: Boolean(e.inStock),
          url: String(e.url || '').slice(0, 500),
        },
      })
      saved++
    }

    return NextResponse.json({ ok: true, saved, source: 'external' })
  }

  if (productId) {
    // Internal scrape for a specific product
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product || !product.searchQuery) {
      return NextResponse.json({ error: 'Product not found or missing searchQuery' }, { status: 404 })
    }

    scrapeHardwarePrices({
      id: product.id,
      name: product.name,
      searchQuery: product.searchQuery,
      maxPrice: product.maxPrice,
    }).catch((e) => console.error('[Scrape] Error:', e))

    return NextResponse.json({ ok: true, message: `Scrape started for "${product.name}"`, source: 'internal' })
  }

  // Scrape all active products
  scrapeAllProducts().catch((e) => console.error('[Scrape] Error:', e))
  return NextResponse.json({ ok: true, message: 'Scrape started for all products', source: 'internal' })
}
