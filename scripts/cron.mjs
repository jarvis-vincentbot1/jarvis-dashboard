#!/usr/bin/env node
// Periodically triggers price scraping for all active products
import { setTimeout as sleep } from 'timers/promises'

const INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours
const CRON_SECRET = process.env.CRON_SECRET ?? 'jarvis-cron'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

console.log(`[Cron] Price scraper cron started. Interval: ${INTERVAL_MS / 3600000}h`)

// Wait for the server to start before first run
await sleep(30000)

while (true) {
  try {
    console.log('[Cron] Triggering price scrape...')
    const res = await fetch(`${BASE_URL}/api/prices/scrape`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET, 'content-type': 'application/json' },
      body: '{}',
    })
    console.log(`[Cron] Scrape triggered: ${res.status}`)
  } catch (e) {
    console.error('[Cron] Error:', e.message)
  }
  await sleep(INTERVAL_MS)
}
