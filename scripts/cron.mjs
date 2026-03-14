// Price scrape cron — DISABLED on VPS
// Scraping is handled by the Mac mini Playwright scraper (scraper/scrape.mjs)
// which posts prices directly to /api/prices/scrape every 30 min via launchd.
// The VPS-side fetch-scraper returned 0 results on all sites due to bot protection.

console.log('[Cron] VPS internal scraper disabled. Mac mini handles price scraping.')
