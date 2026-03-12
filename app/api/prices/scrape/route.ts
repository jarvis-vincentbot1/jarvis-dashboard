// POST /api/prices/scrape
// Two modes:
//   1. Internal trigger (no body) → runs lib/scraper.ts on VPS
//   2. External data push (body with { entries: [...] }) → saves prices directly
//      Used by Mac mini Playwright scraper
//
// Auth: X-Cron-Secret header must match CRON_SECRET env var

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeRTX5090Prices } from '@/lib/scraper'

const PRODUCT_ID = 'rtx-5090'
const PRODUCT_NAME = 'NVIDIA GeForce RTX 5090'

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

  // Check if external scraper is pushing data
  let body: { entries?: PriceEntry[] } = {}
  try {
    const text = await req.text()
    if (text) body = JSON.parse(text)
  } catch { /* empty body = internal trigger */ }

  if (body.entries && Array.isArray(body.entries) && body.entries.length > 0) {
    // Mode 2: Save externally scraped prices
    const entries = body.entries as PriceEntry[]
    console.log(`[Scrape] Received ${entries.length} prices from external scraper`)

    await prisma.product.upsert({
      where: { id: PRODUCT_ID },
      create: { id: PRODUCT_ID, name: PRODUCT_NAME, category: 'gpu' },
      update: {},
    })

    // Clear old entries (>2h)
    await prisma.priceEntry.deleteMany({
      where: {
        productId: PRODUCT_ID,
        scrapedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      }
    })

    // Save new entries
    let saved = 0
    for (const e of entries) {
      if (!e.retailer || !e.price || e.price < 100) continue
      await prisma.priceEntry.create({
        data: {
          productId: PRODUCT_ID,
          retailer: String(e.retailer).slice(0, 50),
          country: String(e.country || 'EU').slice(0, 10),
          price: Number(e.price),
          currency: String(e.currency || 'EUR').slice(0, 5),
          inStock: Boolean(e.inStock),
          url: String(e.url || '').slice(0, 500),
        }
      })
      saved++
    }

    console.log(`[Scrape] Saved ${saved} price entries from Mac mini scraper`)
    return NextResponse.json({ ok: true, saved, source: 'external' })
  }

  // Mode 1: Internal trigger — run scraper on VPS
  scrapeRTX5090Prices().catch((e) => console.error('[Scrape] Error:', e))
  return NextResponse.json({ ok: true, message: 'Scrape started', source: 'internal' })
}
