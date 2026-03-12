// Required env vars:
//   CRON_SECRET=jarvis-cron-2026
//
// Add to Dokploy environment before deploying.

import { NextRequest, NextResponse } from 'next/server'
import { scrapeRTX5090Prices } from '@/lib/scraper'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET ?? 'jarvis-cron'

  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Run in background — don't await so the request returns quickly
  scrapeRTX5090Prices().catch((e) => console.error('[Scrape] Error:', e))

  return NextResponse.json({ ok: true, message: 'Scrape started' })
}
