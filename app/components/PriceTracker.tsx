'use client'

import { useState, useEffect, useCallback } from 'react'

interface PriceEntry {
  id: string
  retailer: string
  country: string
  price: number
  currency: string
  inStock: boolean
  url: string
  scrapedAt: string
}

interface Product {
  id: string
  name: string
  category: string
  entries: PriceEntry[]
}

interface PricesData {
  products: Product[]
}

const COUNTRY_FLAGS: Record<string, string> = {
  NL: '🇳🇱',
  DE: '🇩🇪',
  FR: '🇫🇷',
  GB: '🇬🇧',
  ES: '🇪🇸',
  BE: '🇧🇪',
  AT: '🇦🇹',
  IT: '🇮🇹',
  PL: '🇵🇱',
  EU: '🇪🇺',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function PriceTracker() {
  const [data, setData] = useState<PricesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastFetched(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchPrices])

  async function triggerScrape() {
    setScraping(true)
    try {
      const res = await fetch('/api/prices/scrape', {
        method: 'POST',
        headers: { 'x-cron-secret': 'jarvis-cron' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Wait a moment then refresh
      setTimeout(() => {
        fetchPrices().finally(() => setScraping(false))
      }, 3000)
    } catch (e) {
      console.error('Scrape trigger failed:', e)
      setScraping(false)
    }
  }

  const allEntries = data?.products.flatMap((p) => p.entries) ?? []
  const filtered = inStockOnly ? allEntries.filter((e) => e.inStock) : allEntries
  const hasData = allEntries.length > 0

  const newestScrape = allEntries.reduce<string | null>((acc, e) => {
    if (!acc || e.scrapedAt > acc) return e.scrapedAt
    return acc
  }, null)

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-200">🏷 RTX 5090 Price Tracker</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {newestScrape
                ? `Last scraped: ${timeAgo(newestScrape)}`
                : 'No data yet'}
              {lastFetched && ` · display updated ${timeAgo(lastFetched.toISOString())}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setInStockOnly((v) => !v)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                inStockOnly
                  ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/10'
                  : 'border-[#2a2a2a] text-gray-400 hover:text-gray-300'
              }`}
            >
              In stock only
            </button>
            <button
              onClick={triggerScrape}
              disabled={scraping}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-gray-300 hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
            >
              {scraping ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                  Scraping…
                </span>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-sm text-red-400">
            Error: {error}
          </div>
        ) : !hasData ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">No results yet</p>
            <p className="text-gray-600 text-xs mt-1">Click Refresh to start scraping prices</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">No in-stock items found</p>
            <button
              onClick={() => setInStockOnly(false)}
              className="text-xs text-[#00ff88] mt-2 hover:underline"
            >
              Show all prices
            </button>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retailer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-[#1f1f1f] last:border-0 hover:bg-[#1f1f1f] transition-colors ${
                      i === 0 ? 'bg-[#00ff88]/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-200">
                      {i === 0 && (
                        <span className="text-[10px] bg-[#00ff88]/20 text-[#00ff88] px-1.5 py-0.5 rounded mr-2 font-medium">
                          BEST
                        </span>
                      )}
                      {entry.retailer}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      <span className="mr-1">{COUNTRY_FLAGS[entry.country] ?? '🌐'}</span>
                      {entry.country}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${entry.inStock ? 'text-[#00ff88]' : 'text-gray-500'}`}>
                      {entry.currency === 'EUR' ? '€' : entry.currency}{' '}
                      {entry.price.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.inStock ? (
                        <span className="text-[#00ff88] text-xs font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-600 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden sm:table-cell">
                      {timeAgo(entry.scrapedAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-[#00ff88] transition-colors text-xs"
                      >
                        ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
