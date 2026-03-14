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
  searchQuery: string | null
  maxPrice: number | null
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

function formatPrice(price: number): string {
  return `€${Math.round(price).toLocaleString('nl-NL')}`
}

// ── Add Product Form ────────────────────────────────────────────────────────

interface AddFormProps {
  onAdded: () => void
  onCancel: () => void
}

function AddProductForm({ onAdded, onCancel }: AddFormProps) {
  const [name, setName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !searchQuery.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          searchQuery: searchQuery.trim(),
          maxPrice: maxPrice ? Number(maxPrice) : null,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add')
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Add product to track</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Product name</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!searchQuery) setSearchQuery(e.target.value)
            }}
            placeholder="e.g. NVIDIA RTX 5090"
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3a3a3a]"
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Search query</label>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. RTX 5090"
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3a3a3a]"
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Max price (€) — optional</label>
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="e.g. 2500"
            type="number"
            min="0"
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3a3a3a]"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add product'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Product Card ────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product
  inStockOnly: boolean
  onRemoved: () => void
}

function ProductCard({ product, inStockOnly, onRemoved }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [removing, setRemoving] = useState(false)

  const entries = inStockOnly ? product.entries.filter((e) => e.inStock) : product.entries
  const inStockCount = product.entries.filter((e) => e.inStock).length
  const cheapest = product.entries[0]
  const newestScrape = product.entries.reduce<string | null>((acc, e) => {
    if (!acc || e.scrapedAt > acc) return e.scrapedAt
    return acc
  }, null)

  async function triggerScrape(e: React.MouseEvent) {
    e.stopPropagation()
    setScraping(true)
    try {
      const res = await fetch('/api/prices/scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-cron-secret': 'jarvis-cron-2026' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Refresh after short delay
      setTimeout(() => window.location.reload(), 4000)
    } catch {
      setScraping(false)
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Remove "${product.name}" from tracking?`)) return
    setRemoving(true)
    try {
      await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      onRemoved()
    } catch {
      setRemoving(false)
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Card header — always visible, clickable to expand */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-200 truncate">{product.name}</span>
            {inStockCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] flex-shrink-0">
                {inStockCount} in stock
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {cheapest && (
              <span className="text-xs font-semibold text-[#00ff88]">{formatPrice(cheapest.price)}</span>
            )}
            {product.maxPrice && (
              <span className="text-xs text-gray-600">max {formatPrice(product.maxPrice)}</span>
            )}
            <span className="text-xs text-gray-600">
              {product.entries.length} result{product.entries.length !== 1 ? 's' : ''}
              {newestScrape ? ` · ${timeAgo(newestScrape)}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={triggerScrape}
            disabled={scraping}
            className="px-2.5 py-1 text-[11px] rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
          >
            {scraping ? (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                Scraping
              </span>
            ) : (
              'Refresh'
            )}
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#2a2a2a] text-gray-600 hover:text-red-400 hover:border-red-900/40 transition-colors disabled:opacity-50"
            title="Remove product"
          >
            {removing ? (
              <span className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>
          <span className={`text-gray-600 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </div>

      {/* Expanded price list */}
      {expanded && (
        <div className="border-t border-[#1f1f1f]">
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">
                {product.entries.length === 0 ? 'No data yet — click Refresh to scrape' : 'No in-stock results'}
              </p>
            </div>
          ) : (
            <>
              {/* Best price highlight */}
              {entries[0] && (
                <div className="bg-[#00ff88]/5 border-b border-[#00ff88]/10 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-[#00ff88] tracking-widest uppercase mb-0.5">Best Price</div>
                    <div className="text-gray-200 font-semibold text-sm">{entries[0].retailer}</div>
                    <div className="text-gray-500 text-xs">
                      {COUNTRY_FLAGS[entries[0].country] ?? '🌐'} {entries[0].country}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-[#00ff88] tabular-nums">
                      {formatPrice(entries[0].price)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entries[0].inStock ? '✅ In stock' : '❌ Out of stock'}
                    </div>
                    <a
                      href={entries[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-[#00ff88]/60 hover:text-[#00ff88] transition-colors mt-0.5 inline-block"
                    >
                      View →
                    </a>
                  </div>
                </div>
              )}

              {/* All entries */}
              <div className="divide-y divide-[#1a1a1a]">
                {entries.map((entry) => (
                  <a
                    key={entry.id}
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">{COUNTRY_FLAGS[entry.country] ?? '🌐'}</span>
                      <div className="min-w-0">
                        <div className="text-gray-300 text-sm truncate">{entry.retailer}</div>
                        <div className="text-gray-600 text-xs">{timeAgo(entry.scrapedAt)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="text-right">
                        <div className={`font-semibold tabular-nums text-sm ${entry.inStock ? 'text-gray-100' : 'text-gray-500'}`}>
                          {formatPrice(entry.price)}
                        </div>
                        <div className="text-xs mt-0.5">
                          {entry.inStock
                            ? <span className="text-[#00ff88]">In stock</span>
                            : <span className="text-gray-600">No stock</span>}
                        </div>
                      </div>
                      <span className="text-gray-600 group-hover:text-gray-400 text-xs">↗</span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── EU Retailers List ────────────────────────────────────────────────────────

interface Retailer {
  name: string
  country: string
  flag: string
  url: string
  type: 'shop' | 'tracker'
  note?: string
}

const EU_RETAILERS: Retailer[] = [
  // 🇳🇱 Nederland
  { name: 'Coolblue', country: 'NL', flag: '🇳🇱', type: 'shop', url: 'https://www.coolblue.nl/en/video-cards/nvidia-chipset/nvidia-geforce-rtx-5090', note: 'Voor 23:59 besteld, morgen in huis' },
  { name: 'Alternate NL', country: 'NL', flag: '🇳🇱', type: 'shop', url: 'https://www.alternate.nl/Grafische-kaarten/NVIDIA-grafische-kaarten/RTX-5090' },
  { name: 'Azerty', country: 'NL', flag: '🇳🇱', type: 'shop', url: 'https://azerty.nl/componenten/videokaarten/nvidia/geforce-rtx-5090' },
  { name: 'Bol.com', country: 'NL', flag: '🇳🇱', type: 'shop', url: 'https://www.bol.com/nl/nl/l/nvidia-geforce-rtx-5090-videokaarten/16443/7685302246/' },
  { name: 'Megekko', country: 'NL', flag: '🇳🇱', type: 'shop', url: 'https://www.megekko.nl/search?q=RTX+5090' },
  { name: 'Proshop NL', country: 'NL', flag: '🇳🇱', type: 'shop', url: 'https://www.proshop.nl/NVIDIA-GeForce-RTX-50-Series' },
  { name: 'MediaMarkt NL', country: 'NL', flag: '🇳🇱', type: 'shop', url: 'https://www.mediamarkt.nl/nl/search.html?query=RTX+5090' },
  // 🇩🇪 Duitsland → verzendt naar NL
  { name: 'Alternate DE', country: 'DE', flag: '🇩🇪', type: 'shop', url: 'https://www.alternate.de/Grafikkarten/NVIDIA-Grafikkarten/RTX-5090', note: 'Gratis verzending naar NL' },
  { name: 'Mindfactory', country: 'DE', flag: '🇩🇪', type: 'shop', url: 'https://www.mindfactory.de/Hardware/Grafikkarten+(VGA)/GeForce+RTX+fuer+Gaming/RTX+5090.html' },
  { name: 'Caseking', country: 'DE', flag: '🇩🇪', type: 'shop', url: 'https://www.caseking.de/en/pc-components/graphics-cards/nvidia/rtx-5000/geforce-rtx-5090' },
  { name: 'Cyberport', country: 'DE', flag: '🇩🇪', type: 'shop', url: 'https://www.cyberport.de/computer-hardware/grafikkarte/nvidia/?q=RTX+5090' },
  { name: 'Computeruniverse', country: 'DE', flag: '🇩🇪', type: 'shop', url: 'https://www.computeruniverse.net/en/c/graphics-cards?q=RTX+5090' },
  { name: 'Proshop DE', country: 'DE', flag: '🇩🇪', type: 'shop', url: 'https://www.proshop.de/?search=RTX+5090' },
  { name: 'Amazon DE', country: 'DE', flag: '🇩🇪', type: 'shop', url: 'https://www.amazon.de/s?k=RTX+5090' },
  // 🇧🇪 België
  { name: 'Alternate BE', country: 'BE', flag: '🇧🇪', type: 'shop', url: 'https://www.alternate.be/Grafische-kaarten/NVIDIA-grafische-kaarten/RTX-5090' },
  { name: 'Azerty BE', country: 'BE', flag: '🇧🇪', type: 'shop', url: 'https://azerty.be/componenten/videokaarten/nvidia/geforce-rtx-5090' },
  // 🇫🇷 Frankrijk
  { name: 'LDLC', country: 'FR', flag: '🇫🇷', type: 'shop', url: 'https://www.ldlc.com/informatique/pieces-informatique/carte-graphique-interne/c4684/+fxf-fc3p+fv1028-5090.html', note: 'Grote Franse retailer' },
  { name: 'Amazon FR', country: 'FR', flag: '🇫🇷', type: 'shop', url: 'https://www.amazon.fr/s?k=RTX+5090' },
  // 🇬🇧 UK (let op: buiten EU, evt. douane)
  { name: 'Scan UK', country: 'GB', flag: '🇬🇧', type: 'shop', url: 'https://www.scan.co.uk/search?q=RTX+5090', note: 'Buiten EU (post-Brexit), 0% invoerrecht' },
  { name: 'Overclockers UK', country: 'GB', flag: '🇬🇧', type: 'shop', url: 'https://www.overclockers.co.uk/pc-components/graphics-cards/nvidia-graphics-cards/nvidia-geforce-rtx-5090-graphics-cards', note: 'Buiten EU (post-Brexit), 0% invoerrecht' },
  // 🌍 Prijsvergelijkers & stock trackers
  { name: 'GPUTracker EU', country: 'EU', flag: '🇪🇺', type: 'tracker', url: 'https://www.gputracker.eu/en/search/category/1/graphics-cards/facet/2/graphics-chip/nvidia-rtx-5090', note: 'Alle EU retailers live' },
  { name: 'NowInStock NL', country: 'NL', flag: '🇳🇱', type: 'tracker', url: 'https://www.nowinstock.net/nl/computers/videocards/nvidia/rtx5090/', note: 'Stock alerts per email' },
  { name: 'Tweakers Pricewatch', country: 'NL', flag: '🇳🇱', type: 'tracker', url: 'https://tweakers.net/pricewatch/zoeken/?keyword=RTX+5090', note: 'NL prijsvergelijker' },
  { name: 'BestValueGPU', country: 'EU', flag: '🇪🇺', type: 'tracker', url: 'https://bestvaluegpu.com/en-eu/history/new-and-used-rtx-5090-price-history-and-specs/', note: 'Prijshistorie EU' },
  { name: 'Webprice EU', country: 'EU', flag: '🇪🇺', type: 'tracker', url: 'https://webprice.eu/amazon/rtx%205090/', note: 'Amazon EU vergelijker' },
]

function RetailersList() {
  const [open, setOpen] = useState(false)
  const shops = EU_RETAILERS.filter((r) => r.type === 'shop')
  const trackers = EU_RETAILERS.filter((r) => r.type === 'tracker')

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">🛒 EU Retailers — RTX 5090</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2a2a2a] text-gray-500">
            {shops.length} winkels · {trackers.length} trackers
          </span>
        </div>
        <span className={`text-gray-600 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-[#1f1f1f] p-4 space-y-4">
          {/* Shops */}
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Winkels</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shops.map((r) => (
                <a
                  key={r.name}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#141414] transition-colors group"
                >
                  <span className="text-lg flex-shrink-0">{r.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 font-medium group-hover:text-white transition-colors">{r.name}</div>
                    {r.note && <div className="text-[10px] text-gray-600 truncate">{r.note}</div>}
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 text-xs flex-shrink-0">↗</span>
                </a>
              ))}
            </div>
          </div>

          {/* Trackers */}
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Prijsvergelijkers & stock trackers</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {trackers.map((r) => (
                <a
                  key={r.name}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#f97316]/40 hover:bg-[#141414] transition-colors group"
                >
                  <span className="text-lg flex-shrink-0">{r.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 font-medium group-hover:text-white transition-colors">{r.name}</div>
                    {r.note && <div className="text-[10px] text-orange-500/60 truncate">{r.note}</div>}
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 text-xs flex-shrink-0">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PriceTracker() {
  const [data, setData] = useState<PricesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
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

  const products = data?.products ?? []
  const totalInStock = products.reduce((sum, p) => sum + p.entries.filter((e) => e.inStock).length, 0)

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-200">🖥 Hardware Search</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {products.length} product{products.length !== 1 ? 's' : ''} tracked
              {totalInStock > 0 && ` · ${totalInStock} in stock`}
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
              onClick={() => setShowAddForm((v) => !v)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                showAddForm
                  ? 'border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/10'
                  : 'border-[#2a2a2a] text-gray-400 hover:text-gray-300 hover:border-[#3a3a3a]'
              }`}
            >
              + Add product
            </button>
          </div>
        </div>

        {/* Add product form */}
        {showAddForm && (
          <AddProductForm
            onAdded={() => {
              setShowAddForm(false)
              setLoading(true)
              fetchPrices()
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-sm text-red-400">
            Error: {error}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No products tracked yet</p>
            <p className="text-gray-600 text-xs mt-1">Click "+ Add product" to start tracking hardware prices</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                inStockOnly={inStockOnly}
                onRemoved={fetchPrices}
              />
            ))}
          </div>
        )}

        {/* EU Retailers reference list */}
        <RetailersList />
      </div>
    </div>
  )
}
