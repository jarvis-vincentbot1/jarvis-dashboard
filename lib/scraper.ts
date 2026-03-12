import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
]

async function delay(min: number, max: number) {
  const ms = Math.random() * (max - min) + min
  await new Promise((r) => setTimeout(r, ms))
}

async function fetchWithHeaders(url: string, referer?: string, acceptLang = 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7') {
  await delay(2000, 5000)
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  return fetch(url, {
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': acceptLang,
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Cache-Control': 'no-cache',
      ...(referer ? { 'Referer': referer } : {}),
    },
    signal: AbortSignal.timeout(15000),
  })
}

interface ScrapedEntry {
  retailer: string
  country: string
  price: number
  currency: string
  inStock: boolean
  url: string
}

// ── Tweakers Pricewatch (NL) ──────────────────────────────────────────────────
async function scrapeTweakers(): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  try {
    // Tweakers has a JSON search API
    const searchUrl = 'https://tweakers.net/pricewatch/zoeken/?keyword=rtx+5090&format=json'
    const res = await fetchWithHeaders(searchUrl, 'https://tweakers.net')
    if (!res.ok) {
      // Fallback: try HTML scrape of first page
      console.log(`[Tweakers] JSON API returned ${res.status}, skipping`)
      return results
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('json')) {
      const data = await res.json() as {
        products?: Array<{
          name?: string
          priceFrom?: number
          url?: string
          available?: boolean
        }>
      }
      for (const p of data?.products ?? []) {
        if (!p.name?.toLowerCase().includes('5090')) continue
        if (!p.priceFrom) continue
        results.push({
          retailer: 'Tweakers Pricewatch',
          country: 'NL',
          price: p.priceFrom,
          currency: 'EUR',
          inStock: p.available ?? false,
          url: p.url ? `https://tweakers.net${p.url}` : 'https://tweakers.net/pricewatch/zoeken/?keyword=rtx+5090',
        })
      }
    } else {
      // Parse HTML: look for price elements
      const html = await res.text()
      const priceRegex = /rtx\s*5090[^€]*€\s*([\d,.]+)/gi
      let match
      while ((match = priceRegex.exec(html)) !== null) {
        const priceStr = match[1].replace('.', '').replace(',', '.')
        const price = parseFloat(priceStr)
        if (!isNaN(price) && price > 100) {
          results.push({
            retailer: 'Tweakers Pricewatch',
            country: 'NL',
            price,
            currency: 'EUR',
            inStock: false,
            url: 'https://tweakers.net/pricewatch/zoeken/?keyword=rtx+5090',
          })
          break // just get first/best price
        }
      }
    }
  } catch (e) {
    console.error('[Scraper] Tweakers failed:', e)
  }
  return results
}

// ── Geizhals (DE/AT/EU) ──────────────────────────────────────────────────────
async function scrapeGeizhals(): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  try {
    const url = 'https://geizhals.eu/?cat=gra16_512&xf=10275_5090&sort=p'
    const res = await fetchWithHeaders(url, 'https://geizhals.eu', 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7')
    if (!res.ok) {
      console.log(`[Geizhals] Returned ${res.status}`)
      return results
    }
    const html = await res.text()

    // Extract product listings: look for price patterns near 5090 mentions
    // Geizhals HTML has class="gh_price" or data patterns
    const blockRegex = /5090[\s\S]{0,400}?€\s*([\d,.]+)/gi
    let match
    const seen = new Set<number>()
    while ((match = blockRegex.exec(html)) !== null) {
      const priceStr = match[1].replace(/\./g, '').replace(',', '.')
      const price = parseFloat(priceStr)
      if (!isNaN(price) && price > 500 && price < 20000 && !seen.has(Math.round(price))) {
        seen.add(Math.round(price))
        results.push({
          retailer: 'Geizhals',
          country: 'DE',
          price,
          currency: 'EUR',
          inStock: false,
          url,
        })
        if (results.length >= 5) break
      }
    }
  } catch (e) {
    console.error('[Scraper] Geizhals failed:', e)
  }
  return results
}

// ── Idealo (DE) ───────────────────────────────────────────────────────────────
async function scrapeIdealo(): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  try {
    const url = 'https://www.idealo.de/preisvergleich/OffersOfProduct/Liste/5090.html'
    const searchUrl = 'https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=RTX+5090'
    const res = await fetchWithHeaders(searchUrl, 'https://www.idealo.de', 'de-DE,de;q=0.9,en;q=0.8')
    if (!res.ok) {
      console.log(`[Idealo] Returned ${res.status}`)
      return results
    }
    const html = await res.text()

    // Look for JSON-LD structured data or price patterns
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    let m
    while ((m = jsonLdRegex.exec(html)) !== null) {
      try {
        const obj = JSON.parse(m[1])
        const items = Array.isArray(obj) ? obj : [obj]
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type'] === 'ItemList') {
            const offers = item.offers ?? item.itemListElement
            if (Array.isArray(offers)) {
              for (const offer of offers.slice(0, 3)) {
                const price = parseFloat(offer.price ?? offer.offers?.price)
                const name: string = item.name ?? offer.name ?? ''
                if (!isNaN(price) && price > 500 && name.toLowerCase().includes('5090')) {
                  results.push({
                    retailer: 'Idealo',
                    country: 'DE',
                    price,
                    currency: offer.priceCurrency ?? 'EUR',
                    inStock: offer.availability?.includes('InStock') ?? false,
                    url: offer.url ?? searchUrl,
                  })
                }
              }
            }
          }
        }
      } catch {
        // malformed JSON-LD, skip
      }
    }

    if (results.length === 0) {
      // Fallback: regex price parsing
      const priceRegex = /(?:RTX\s*5090|GeForce\s*5090)[\s\S]{0,300}?(\d{1,2}[.,]\d{3}(?:[.,]\d{2})?)\s*€/gi
      let match
      const seen = new Set<number>()
      while ((match = priceRegex.exec(html)) !== null) {
        const priceStr = match[1].replace(/\./g, '').replace(',', '.')
        const price = parseFloat(priceStr)
        if (!isNaN(price) && price > 500 && price < 20000 && !seen.has(Math.round(price))) {
          seen.add(Math.round(price))
          results.push({
            retailer: 'Idealo',
            country: 'DE',
            price,
            currency: 'EUR',
            inStock: false,
            url: searchUrl,
          })
          if (results.length >= 3) break
        }
      }
    }
  } catch (e) {
    console.error('[Scraper] Idealo failed:', e)
  }
  return results
}

// ── Main scrape function ──────────────────────────────────────────────────────
export async function scrapeRTX5090Prices(): Promise<void> {
  console.log('[Scraper] Starting RTX 5090 price scrape...')

  // Ensure the product exists
  const product = await prisma.product.upsert({
    where: { id: 'rtx-5090' },
    create: { id: 'rtx-5090', name: 'NVIDIA GeForce RTX 5090', category: 'gpu' },
    update: {},
  })

  const scrapers = [scrapeTweakers, scrapeGeizhals, scrapeIdealo]
  let totalSaved = 0

  for (const scraper of scrapers) {
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
      totalSaved++
    }
  }

  console.log(`[Scraper] Done. Saved ${totalSaved} price entries.`)
  await prisma.$disconnect()
}
