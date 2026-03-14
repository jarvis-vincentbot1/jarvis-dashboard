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

interface ProductInfo {
  id: string
  name: string
  searchQuery: string
  maxPrice?: number | null
}

// ── GPUTracker.eu ─────────────────────────────────────────────────────────────
// EU-focused GPU price tracker aggregating many retailers
async function scrapeGpuTracker(query: string): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  const encoded = encodeURIComponent(query)
  const url = `https://www.gputracker.eu/en/list/graph-card?s=${encoded}`
  console.log('[GPUTracker] Fetching...')
  const res = await fetchPage(url, 'nl-NL,nl;q=0.9,en;q=0.8', 'https://www.gputracker.eu')
  if (!res || !res.ok) {
    console.log(`[GPUTracker] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  // GPUTracker shows prices in product cards with retailer info
  // Look for JSON-LD product data first
  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const offers = Array.isArray(item.offers) ? item.offers : item.offers ? [item.offers] : []
          for (const offer of offers) {
            const price = parseFloat(offer.price ?? 0)
            if (price > 50) {
              const seller = offer.seller?.name ?? offer.name ?? 'GPUTracker'
              results.push({
                retailer: String(seller).slice(0, 50),
                country: 'EU',
                price,
                currency: offer.priceCurrency ?? 'EUR',
                inStock: offer.availability?.includes('InStock') ?? false,
                url: offer.url ?? url,
              })
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  // Fallback: scrape price blocks directly
  if (results.length === 0) {
    // Match patterns like: retailer name ... €1.999 or €999,00
    const blockRegex = /class="[^"]*(?:price|offer|product)[^"]*"[\s\S]{0,300}?(\d{1,2}\.?\d{3}[,\.]\d{2})\s*€/gi
    const seen = new Set<number>()
    while ((m = blockRegex.exec(html)) !== null && results.length < 10) {
      const raw = m[1].replace(/\./g, '').replace(',', '.')
      const price = parseFloat(raw)
      if (!isNaN(price) && price > 50 && !seen.has(Math.round(price))) {
        seen.add(Math.round(price))
        results.push({ retailer: 'GPUTracker', country: 'EU', price, currency: 'EUR', inStock: true, url })
      }
    }
  }

  console.log(`[GPUTracker] Found ${results.length} prices`)
  return results
}

// ── Geizhals EU ──────────────────────────────────────────────────────────────
// Comprehensive European price comparison with many niche retailers
async function scrapeGeizhals(query: string): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  await delay(2000, 4000)
  const encoded = encodeURIComponent(query)
  const url = `https://geizhals.eu/?fs=${encoded}&sort=p&v=e`
  console.log('[Geizhals] Fetching...')
  const res = await fetchPage(url, 'de-DE,de;q=0.9,en;q=0.8', 'https://geizhals.eu')
  if (!res || !res.ok) {
    console.log(`[Geizhals] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  // Geizhals shows prices like "1.999,00 €"
  const seen = new Set<number>()
  // Look for merchant entries with prices
  const blockRegex = /(\d{1,2}\.?\d{3}[,\.]\d{2})\s*€/g
  let m: RegExpExecArray | null
  while ((m = blockRegex.exec(html)) !== null && results.length < 15) {
    const raw = m[1].replace(/\./g, '').replace(',', '.')
    const price = parseFloat(raw)
    if (!isNaN(price) && price > 50 && !seen.has(Math.round(price))) {
      seen.add(Math.round(price))
      results.push({ retailer: 'Geizhals', country: 'EU', price, currency: 'EUR', inStock: true, url })
    }
  }

  // Also try to extract retailer names from result blocks
  if (results.length === 0) {
    const simplePrice = /€\s*([\d.,]+)/g
    while ((m = simplePrice.exec(html)) !== null && results.length < 8) {
      const raw = m[1].replace(/\./g, '').replace(',', '.')
      const price = parseFloat(raw)
      if (!isNaN(price) && price > 50 && !seen.has(Math.round(price))) {
        seen.add(Math.round(price))
        results.push({ retailer: 'Geizhals', country: 'EU', price, currency: 'EUR', inStock: true, url })
      }
    }
  }

  console.log(`[Geizhals] Found ${results.length} prices`)
  return results
}

// ── Tweakers Pricewatch (NL) ─────────────────────────────────────────────────
async function scrapeTweakers(query: string): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  await delay(2000, 4000)
  const encoded = encodeURIComponent(query)
  const url = `https://tweakers.net/pricewatch/zoeken/?keyword=${encoded}`
  console.log('[Tweakers] Fetching...')
  const res = await fetchPage(url, 'nl-NL,nl;q=0.9,en;q=0.8', 'https://tweakers.net')
  if (!res || !res.ok) {
    console.log(`[Tweakers] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  const seen = new Set<number>()
  let m: RegExpExecArray | null

  // Try data-price attributes
  const dataPriceRegex = /data-price="(\d+)"/gi
  while ((m = dataPriceRegex.exec(html)) !== null && results.length < 8) {
    const price = parseInt(m[1])
    if (price > 50 && !seen.has(price)) {
      seen.add(price)
      results.push({ retailer: 'Tweakers', country: 'NL', price, currency: 'EUR', inStock: true, url })
    }
  }

  // Fallback: euro price pattern
  if (results.length === 0) {
    const priceRegex = /&euro;\s*([\d.]+)/gi
    while ((m = priceRegex.exec(html)) !== null && results.length < 5) {
      const price = parseFloat(m[1].replace('.', '').replace(',', '.'))
      if (!isNaN(price) && price > 50 && !seen.has(Math.round(price))) {
        seen.add(Math.round(price))
        results.push({ retailer: 'Tweakers', country: 'NL', price, currency: 'EUR', inStock: true, url })
      }
    }
  }

  console.log(`[Tweakers] Found ${results.length} prices`)
  return results
}

// ── Megekko (NL) ─────────────────────────────────────────────────────────────
async function scrapeMegekko(query: string): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  await delay(2000, 4000)
  const encoded = encodeURIComponent(query)
  const url = `https://www.megekko.nl/search?q=${encoded}`
  console.log('[Megekko] Fetching...')
  const res = await fetchPage(url, 'nl-NL,nl;q=0.9', 'https://www.megekko.nl')
  if (!res || !res.ok) {
    console.log(`[Megekko] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const price = parseFloat(item.offers?.price ?? item.offers?.lowPrice ?? 0)
          if (price > 50) {
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

  console.log(`[Megekko] Found ${results.length} prices`)
  return results
}

// ── Alternate NL ─────────────────────────────────────────────────────────────
async function scrapeAlternate(query: string): Promise<ScrapedEntry[]> {
  const results: ScrapedEntry[] = []
  await delay(2000, 4000)
  const encoded = encodeURIComponent(query)
  const url = `https://www.alternate.nl/listing.xhtml?q=${encoded}`
  console.log('[Alternate] Fetching...')
  const res = await fetchPage(url, 'nl-NL,nl;q=0.9', 'https://www.alternate.nl')
  if (!res || !res.ok) {
    console.log(`[Alternate] Failed: ${res?.status}`)
    return results
  }
  const html = await res.text()

  const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product') {
          const price = parseFloat(item.offers?.price ?? 0)
          if (price > 50) {
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

// ── Main generic scrape function ──────────────────────────────────────────────
export async function scrapeHardwarePrices(product: ProductInfo) {
  const { id, name, searchQuery, maxPrice } = product
  console.log(`[Scraper] Starting scrape for "${name}" (query: "${searchQuery}")`)

  // Ensure product exists in DB
  await prisma.product.upsert({
    where: { id },
    create: { id, name, searchQuery, maxPrice: maxPrice ?? null, category: 'gpu' },
    update: { name, searchQuery, maxPrice: maxPrice ?? null },
  })

  // Clear existing entries
  await prisma.priceEntry.deleteMany({ where: { productId: id } })

  let saved = 0

  const scrapers = [
    () => scrapeGpuTracker(searchQuery),
    () => scrapeGeizhals(searchQuery),
    () => scrapeTweakers(searchQuery),
    () => scrapeMegekko(searchQuery),
    () => scrapeAlternate(searchQuery),
  ]

  for (const scraper of scrapers) {
    try {
      const entries = await scraper()
      for (const entry of entries) {
        // Skip if above max price
        if (maxPrice && entry.price > maxPrice) continue
        if (!entry.retailer || !entry.price || entry.price < 10) continue

        await prisma.priceEntry.create({
          data: {
            productId: id,
            retailer: String(entry.retailer).slice(0, 50),
            country: String(entry.country || 'EU').slice(0, 10),
            price: Number(entry.price),
            currency: String(entry.currency || 'EUR').slice(0, 5),
            inStock: Boolean(entry.inStock),
            url: String(entry.url || '').slice(0, 500),
          },
        })
        saved++
      }
    } catch (e) {
      console.error(`[Scraper] Scraper failed:`, e)
    }
  }

  console.log(`[Scraper] Done for "${name}". Saved ${saved} entries.`)
  return saved
}

// ── Scrape all active products ────────────────────────────────────────────────
export async function scrapeAllProducts() {
  const products = await prisma.product.findMany({
    where: { active: true, NOT: { searchQuery: null } },
  })

  console.log(`[Scraper] Scraping ${products.length} products...`)

  for (const product of products) {
    if (!product.searchQuery) continue
    await scrapeHardwarePrices({
      id: product.id,
      name: product.name,
      searchQuery: product.searchQuery,
      maxPrice: product.maxPrice,
    })
    await delay(5000, 10000)
  }
}

// ── Legacy RTX 5090 scrape (kept for backward compat) ────────────────────────
export async function scrapeRTX5090Prices() {
  return scrapeHardwarePrices({
    id: 'rtx-5090',
    name: 'NVIDIA GeForce RTX 5090',
    searchQuery: 'RTX 5090',
    maxPrice: null,
  })
}
