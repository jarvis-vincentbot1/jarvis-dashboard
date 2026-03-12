// Price scrape cron — run every 30 minutes
// Started by scripts/start.sh before Next.js server

const SCRAPE_INTERVAL_MS = 30 * 60 * 1000

async function triggerScrape() {
  try {
    const res = await fetch('http://localhost:3000/api/prices/scrape', {
      method: 'POST',
      headers: { 'X-Cron-Secret': process.env.CRON_SECRET ?? 'jarvis-cron' },
    })
    if (res.ok) {
      console.log(`[Cron] Price scrape triggered at ${new Date().toISOString()}`)
    } else {
      console.error(`[Cron] Scrape returned ${res.status}`)
    }
  } catch (e) {
    console.error('[Cron] Scrape failed:', e)
  }
}

// Initial scrape after 60s (let Next.js fully start first)
setTimeout(triggerScrape, 60_000)

// Then every 30 minutes
setInterval(triggerScrape, SCRAPE_INTERVAL_MS)

console.log('[Cron] Price scrape cron started. First run in 60s, then every 30m.')
