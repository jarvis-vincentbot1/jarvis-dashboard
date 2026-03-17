'use client'

import { useState, useEffect, useRef } from 'react'
import ShippingCalculator from './ShippingCalculator'

interface CalcEntry {
  date: string
  buyEur: number
  sellUsd: number
  qty: number
  profitAfterVat: number
  marginPct: number
}

interface RateCache {
  rate: number
  timestamp: number
}

const STORAGE_KEY = 'vat-calc-history'
const RATE_STORAGE_KEY = 'vat-eur-usd-rate'
const VAT_RATE = 0.21
const DEFAULT_RATE = 1.09
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

type RateStatus = 'live' | 'cached' | 'fallback'

export default function VatCalculator() {
  const [activeTab, setActiveTab] = useState<'vat' | 'shipping'>('vat')
  const [buyEur, setBuyEur] = useState('')
  const [sellUsd, setSellUsd] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [rate, setRate] = useState(String(DEFAULT_RATE))
  const [history, setHistory] = useState<CalcEntry[]>([])
  const [rateStatus, setRateStatus] = useState<RateStatus>('fallback')
  const [rateUpdatedAt, setRateUpdatedAt] = useState<number | null>(null)
  const [rateFetching, setRateFetching] = useState(false)

  // Refs to read DOM values directly — catches browser autofill & value-memory
  const buyRef = useRef<HTMLInputElement>(null)
  const sellRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const rateRef = useRef<HTMLInputElement>(null)

  async function fetchExchangeRate(force = false) {
    // Try cache first (unless forced)
    if (!force) {
      try {
        const cached = localStorage.getItem(RATE_STORAGE_KEY)
        if (cached) {
          const { rate: cachedRate, timestamp }: RateCache = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_TTL_MS) {
            setRate(String(cachedRate))
            setRateStatus('cached')
            setRateUpdatedAt(timestamp)
            return
          }
        }
      } catch {}
    }

    setRateFetching(true)
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD')
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      const newRate: number = data.rates.USD
      const now = Date.now()
      const cache: RateCache = { rate: newRate, timestamp: now }
      try { localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(cache)) } catch {}
      setRate(String(newRate))
      setRateStatus('live')
      setRateUpdatedAt(now)
    } catch {
      // Fallback: use any cached value even if stale
      try {
        const cached = localStorage.getItem(RATE_STORAGE_KEY)
        if (cached) {
          const { rate: cachedRate, timestamp }: RateCache = JSON.parse(cached)
          setRate(String(cachedRate))
          setRateStatus('cached')
          setRateUpdatedAt(timestamp)
          return
        }
      } catch {}
      // Last resort: hardcoded default
      setRate(String(DEFAULT_RATE))
      setRateStatus('fallback')
    } finally {
      setRateFetching(false)
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setHistory(JSON.parse(saved))
    } catch {}

    fetchExchangeRate()

    // Poll every 300ms for autofill / browser-remembered values
    const interval = setInterval(() => {
      const bv = buyRef.current?.value ?? ''
      const sv = sellRef.current?.value ?? ''
      const qv = qtyRef.current?.value ?? ''
      const rv = rateRef.current?.value ?? ''
      if (bv) setBuyEur(bv)
      if (sv) setSellUsd(sv)
      if (qv) setQuantity(qv)
      if (rv) setRate(rv)
    }, 300)
    // Stop polling once user has interacted
    const stop = setTimeout(() => clearInterval(interval), 5000)
    return () => { clearInterval(interval); clearTimeout(stop) }
  }, [])

  // Computed values
  const buy = parseFloat(buyEur.replace(',', '.')) || 0
  const sell = parseFloat(sellUsd.replace(',', '.')) || 0
  const qty = Math.max(1, parseInt(quantity) || 1)
  const eurUsd = parseFloat(rate.replace(',', '.')) || DEFAULT_RATE

  const buyExclVat = buy / (1 + VAT_RATE)
  const vatPerUnit = buy - buyExclVat
  const totalVatFloat = vatPerUnit * qty

  const sellEur = sell / eurUsd
  const profitBeforeVatPerUnit = sellEur - buy
  const profitBeforeVatTotal = profitBeforeVatPerUnit * qty
  const profitAfterVatPerUnit = sellEur - buyExclVat
  const profitAfterVatTotal = profitAfterVatPerUnit * qty
  const marginPct = sellEur > 0 ? (profitAfterVatPerUnit / sellEur) * 100 : 0

  const hasValues = buy > 0 && sell > 0

  function saveToHistory() {
    if (!hasValues) return
    const entry: CalcEntry = {
      date: new Date().toISOString(),
      buyEur: buy,
      sellUsd: sell,
      qty,
      profitAfterVat: profitAfterVatTotal,
      marginPct,
    }
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 10)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  function clearHistory() {
    setHistory([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  function fmt(n: number, decimals = 2) {
    return n.toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function fmtUpdatedAt(ts: number) {
    const diff = Date.now() - ts
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return fmtDate(new Date(ts).toISOString())
  }

  // Shared input class
  const inputCls = 'w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-3 text-white text-base focus:outline-none focus:border-[#00ff88] transition-colors'

  const statusBadge = {
    live: <span className="text-[10px] font-semibold bg-[#00ff88]/15 text-[#00ff88] rounded px-1.5 py-0.5 leading-none">● Live</span>,
    cached: <span className="text-[10px] font-semibold bg-yellow-500/15 text-yellow-400 rounded px-1.5 py-0.5 leading-none">◷ Cached</span>,
    fallback: <span className="text-[10px] font-semibold bg-red-500/15 text-red-400 rounded px-1.5 py-0.5 leading-none">⚠ Fallback</span>,
  }[rateStatus]

  return (
    <div className="min-h-full bg-[#0f0f0f]">
      <div className="max-w-2xl w-full mx-auto p-4 pb-8 space-y-4">

        {/* Header with Tabs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#00ff88] font-bold text-lg tracking-wide">Calculator</h2>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('vat')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vat'
                  ? 'bg-[#00ff88] text-[#0f0f0f]'
                  : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
              }`}
            >
              VAT Calculator
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'shipping'
                  ? 'bg-[#00ff88] text-[#0f0f0f]'
                  : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
              }`}
            >
              Shipping Calculator
            </button>
          </div>
          
          {/* Tab Description */}
          {activeTab === 'vat' && (
            <p className="text-gray-500 text-xs mt-0.5">Buy incl. 21% Dutch VAT → Sell in USD excl. VAT</p>
          )}
          {activeTab === 'shipping' && (
            <p className="text-gray-500 text-xs mt-0.5">Calculate shipping costs and profit margins by carrier and destination</p>
          )}
        </div>

        {/* VAT Calculator Tab */}
        {activeTab === 'vat' && (
        <>
        {/* Inputs */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest">Inputs</h3>

          <div>
            <label className="block text-gray-500 text-xs mb-1">Buy price (EUR incl. 21% VAT)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
              <input
                ref={buyRef}
                inputMode="decimal"
                value={buyEur}
                onChange={(e) => setBuyEur(e.target.value)}
                onBlur={(e) => setBuyEur(e.target.value)}
                placeholder="3449"
                className={`${inputCls} pl-7`}
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-500 text-xs mb-1">Sell price (USD excl. VAT)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                ref={sellRef}
                inputMode="decimal"
                value={sellUsd}
                onChange={(e) => setSellUsd(e.target.value)}
                onBlur={(e) => setSellUsd(e.target.value)}
                placeholder="3750"
                className={`${inputCls} pl-7`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Quantity</label>
              <input
                ref={qtyRef}
                inputMode="numeric"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onBlur={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className={inputCls}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-500 text-xs flex items-center gap-1.5">
                  EUR/USD {statusBadge}
                </label>
                <button
                  onClick={() => fetchExchangeRate(true)}
                  disabled={rateFetching}
                  className="text-[10px] text-gray-600 active:text-[#00ff88] disabled:opacity-40 transition-colors leading-none"
                  title="Refresh rate"
                >
                  {rateFetching ? '⟳ loading…' : '⟳ refresh'}
                </button>
              </div>
              <input
                ref={rateRef}
                inputMode="decimal"
                step="0.001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                onBlur={(e) => setRate(e.target.value)}
                className={inputCls}
              />
              {rateUpdatedAt && (
                <p className="text-[10px] text-gray-600 mt-1">Updated {fmtUpdatedAt(rateUpdatedAt)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {hasValues ? (
          <div className="space-y-3">
            {/* Buy breakdown */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-2">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Buy breakdown</h3>
              <Row label="Buy excl. VAT (per unit)" value={`€ ${fmt(buyExclVat)}`} />
              <Row label={`Buy excl. VAT (× ${qty})`} value={`€ ${fmt(buyExclVat * qty)}`} />
              <Row label="VAT per unit (21%)" value={`€ ${fmt(vatPerUnit)}`} />
              <div className="border border-orange-500/30 bg-orange-500/5 rounded-lg px-3 py-2.5 flex items-center justify-between mt-1">
                <div>
                  <span className="text-orange-400 text-sm font-medium">Total VAT float</span>
                  <span className="text-orange-500/60 text-xs block">Locked capital — reclaimed later</span>
                </div>
                <span className="text-orange-400 font-bold">€ {fmt(totalVatFloat)}</span>
              </div>
            </div>

            {/* Sell & profit */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-2">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Sell &amp; Profit</h3>
              <Row label="Sell price in EUR (per unit)" value={`€ ${fmt(sellEur)}`} sub={`$${fmt(sell)} ÷ ${fmt(eurUsd, 3)}`} />
              <div className="h-px bg-[#2a2a2a]" />
              <Row label={`Profit BEFORE VAT return (× ${qty})`} value={`€ ${fmt(profitBeforeVatTotal)}`} color={profitBeforeVatTotal >= 0 ? 'text-gray-300' : 'text-red-400'} />
              <div className="h-px bg-[#2a2a2a]" />
              <Row label="Profit AFTER VAT (per unit)" value={`€ ${fmt(profitAfterVatPerUnit)}`} color={profitAfterVatPerUnit >= 0 ? 'text-[#00ff88]' : 'text-red-400'} bold />
              <Row label={`Profit AFTER VAT (× ${qty})`} value={`€ ${fmt(profitAfterVatTotal)}`} color={profitAfterVatTotal >= 0 ? 'text-[#00ff88]' : 'text-red-400'} bold />
              <div className="h-px bg-[#2a2a2a]" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Margin % (after VAT return)</span>
                <span className={`font-bold text-lg ${marginPct >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>{fmt(marginPct, 1)}%</span>
              </div>
            </div>

            <button
              onClick={saveToHistory}
              className="w-full py-3 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-xl text-sm text-[#00ff88] font-medium active:bg-[#00ff88]/20 transition-colors"
            >
              Save to History
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 text-sm">
            Enter buy and sell prices to see results
          </div>
        )}

        {/* History — mobile-friendly card layout */}
        {history.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest">History ({history.length})</h3>
              <button onClick={clearHistory} className="text-xs text-gray-600 active:text-red-400 transition-colors">Clear</button>
            </div>
            <div className="space-y-2">
              {history.map((entry, i) => (
                <div key={i} className="bg-[#0f0f0f] rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600 text-xs">{fmtDate(entry.date)}</span>
                    <span className={`font-bold text-sm ${entry.marginPct >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                      {fmt(entry.marginPct, 1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>€{fmt(entry.buyEur)} buy · ${fmt(entry.sellUsd)} sell · ×{entry.qty}</span>
                    <span className={entry.profitAfterVat >= 0 ? 'text-[#00ff88]' : 'text-red-400'}>
                      €{fmt(entry.profitAfterVat)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}

        {/* Shipping Calculator Tab */}
        {activeTab === 'shipping' && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <ShippingCalculator />
          </div>
        )}

      </div>
    </div>
  )
}

function Row({ label, value, sub, color = 'text-gray-300', bold = false }: {
  label: string; value: string; sub?: string; color?: string; bold?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <span className="text-gray-400 text-sm">{label}</span>
        {sub && <span className="text-gray-600 text-xs block">{sub}</span>}
      </div>
      <span className={`${color} text-sm flex-shrink-0 ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}
