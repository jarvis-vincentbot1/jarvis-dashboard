import { prisma } from '@/lib/prisma'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
]

async function delay(min: number, max: number) {
  const ms = Math.random() * (max - min) + min
  await new Promise((r) => setTimeout(r, ms))
}

async function fetchPage(url: string, acceptLang = 'nl-NL,nl;q=0.9,en;q=0.8', referer?: string) {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': acceptLang,
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
        ...(referer ? { 'Referer': referer } : {}),
      },
      signal: AbortSignal.timeout(20000),
    })
    return res
  } catch (e) {
    console.error(`[Scraper] Fetch error for ${url}:`, e)
    return null
  }
}

interface ScrapedEntry {
  retailer: string
  country: string
  price: number
  currency: string
  inStock: boolean
  url: string
}

// ── Tweakers Pricewatch (NL) ─────────────────────────────────────────────────
// Tweakers has a public pricewatch that works well
async function scrapeTweakers(): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  const url = 'https://tweakers.net/pricewatch/zoeken/?keyword=rtx+5090'
  console.log('[Tweakers] Fetching...')
  const res = await fetchPage(url, 'nl-NL,nl;q=0.9,en;q=0.8', 'https://tweakers.net')
  if (!res || !res.ok) {
    console.log(`[Tweakers] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  // Extract JSON-LD or price data from Tweakers
  // Tweakers includes pricing in their HTML as data attributes or JSON
  const priceRegex = /class="price[^"]*"[^>]*>(?:[^<]*<[^>]+>)*[^<]*&euro;\s*([\d.]+)/gi
  let m: RegExpExecArray | null
  const seen = new Set<number>()
  while ((m = priceRegex.exec(html)) !== null && results.length < 5) {
    const price = parseFloat(m[1].replace('.', '').replace(',', '.'))
    if (!isNaN(price) && price > 500 && price < 5000 && !seen.has(Math.round(price))) {
      seen.add(Math.round(price))
      results.push({ retailer: 'Tweakers', country: 'NL', price, currency: 'EUR', inStock: true, url })
    }
  }

  // Alternative: look for data-price attributes
  if (results.length === 0) {
    const dataPriceRegex = /data-price="(\d+)"/gi
    while ((m = dataPriceRegex.exec(html)) !== null && results.length < 5) {
      const price = parseInt(m[1])
      if (price > 500 && price < 5000 && !seen.has(price)) {
        seen.add(price)
        results.push({ retailer: 'Tweakers', country: 'NL', price, currency: 'EUR', inStock: true, url })
      }
    }
  }

  console.log(`[Tweakers] Found ${results.length} prices`)
  return results
}

// ── Geizhals EU ──────────────────────────────────────────────────────────────
// Geizhals is a European comparison site, generally scraper-friendly
async function scrapeGeizhals(): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  await delay(3000, 6000) // Wait after Tweakers
  const url = 'https://geizhals.eu/?cat=gra16_512&xf=10275_5090&sort=p&v=e'
  console.log('[Geizhals] Fetching...')
  const res = await fetchPage(url, 'de-DE,de;q=0.9,en;q=0.8', 'https://geizhals.eu')
  if (!res || !res.ok) {
    console.log(`[Geizhals] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  // Geizhals shows prices like "1.999,00"
  const seen = new Set<number>()
  // Look for product entries with prices
  const blockRegex = /5090[\s\S]{0,600}?(\d{1,2}\.?\d{3}[,\.]\d{2})\s*€/gi
  let m: RegExpExecArray | null
  while ((m = blockRegex.exec(html)) !== null && results.length < 8) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const price = parseFloat(raw)
    if (!isNaN(price) && price > 500 && price < 5000 && !seen.has(Math.round(price))) {
      seen.add(Math.round(price))
      results.push({ retailer: 'Geizhals', country: 'EU', price, currency: 'EUR', inStock: true, url })
    }
  }

  console.log(`[Geizhals] Found ${results.length} prices`)
  return results
}

// ── Megekko (NL) ─────────────────────────────────────────────────────────────
// Dutch tech retailer, fairly scraper-friendly
async function scrapeMegekko(): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  await delay(3000, 5000)
  const url = 'https://www.megekko.nl/product/3/35/Grafische-kaarten/RTX-5090'
  console.log('[Megekko] Fetching...')
  const res = await fetchPage(url, 'nl-NL,nl;q=0.9', 'https://www.megekko.nl')
  if (!res || !res.ok) {
    console.log(`[Megekko] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  // Look for JSON-LD product listings
  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product' && item.name?.toLowerCase().includes('5090')) {
          const price = parseFloat(item.offers?.price ?? item.offers?.lowPrice ?? 0)
          if (price > 500) {
            results.push({
              retailer: 'Megekko',
              country: 'NL',
              price,
              currency: item.offers?.priceCurrency ?? 'EUR',
              inStock: item.offers?.availability?.includes('InStock') ?? false,
              url: item.offers?.url ?? url,
            })
          }
        }
      }
    } catch { /* skip */ }
  }

  // Fallback: regex for price
  if (results.length === 0) {
    const priceRegex = /5090[\s\S]{0,500}?€\s*([\d.,]+)/gi
    while ((m = priceRegex.exec(html)) !== null && results.length < 3) {
      const raw = m[1].replace(/\./g, '').replace(',', '.')
      const price = parseFloat(raw)
      if (!isNaN(price) && price > 500 && price < 5000) {
        results.push({ retailer: 'Megekko', country: 'NL', price, currency: 'EUR', inStock: false, url })
      }
    }
  }

  console.log(`[Megekko] Found ${results.length} prices`)
  return results
}

// ── Alternate (NL/DE) ────────────────────────────────────────────────────────
async function scrapeAlternate(): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  await delay(2000, 4000)
  const url = 'https://www.alternate.nl/listing.xhtml?q=rtx+5090'
  console.log('[Alternate] Fetching...')
  const res = await fetchPage(url, 'nl-NL,nl;q=0.9', 'https://www.alternate.nl')
  if (!res || !res.ok) {
    console.log(`[Alternate] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  // Alternate uses JSON-LD
  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product' && item.name?.toLowerCase().includes('5090')) {
          const price = parseFloat(item.offers?.price ?? 0)
          if (price > 500) {
            results.push({
              retailer: 'Alternate NL',
              country: 'NL',
              price,
              currency: 'EUR',
              inStock: item.offers?.availability?.includes('InStock') ?? false,
              url: item.offers?.url ?? url,
            })
          }
        }
      }
    } catch { /* skip */ }
  }

  console.log(`[Alternate] Found ${results.length} prices`)
  return results
}

// ── Main scrape function ──────────────────────────────────────────────────────
export async function scrapeRTX5090Prices() {
  console.log('[Scraper] Starting RTX 5090 price scrape...')

  // Upsert the product
  const product = await prisma.product.upsert({
    where: { id: 'rtx-5090' },
    create: { id: 'rtx-5090', name: 'NVIDIA GeForce RTX 5090', category: 'gpu' },
    update: {},
  })

  let saved = 0

  // Clear all entries before saving fresh data
  await prisma.priceEntry.deleteMany({
    where: { productId: product.id }
  })

  // Run scrapers sequentially (be polite, avoid simultaneous requests)
  const scrapers = [scrapeTweakers, scrapeGeizhals, scrapeMegekko, scrapeAlternate]
  for (const scraper of scrapers) {
    try {
      const entries = await scraper()
      for (const entry of entries) {
        await prisma.priceEntry.create({
          data: {
            productId: product.id,
            retailer: entry.retailer,
            country: entry.country,
            price: entry.price,
            currency: entry.currency,
            inStock: entry.inStock,
            url: entry.url,
          },
        })
        saved++
      }
    } catch (e) {
      console.error(`[Scraper] Scraper failed:`, e)
    }
  }

  console.log(`[Scraper] Done. Saved ${saved} price entries.`)
}
