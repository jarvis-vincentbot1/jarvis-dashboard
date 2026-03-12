'use client'

import { useState, useEffect } from 'react'

interface CalcEntry {
  date: string
  buyEur: number
  sellUsd: number
  qty: number
  profitAfterVat: number
  marginPct: number
}

const STORAGE_KEY = 'vat-calc-history'

export default function VatCalculator() {
  const [buyEur, setBuyEur] = useState('')
  const [sellUsd, setSellUsd] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [rate, setRate] = useState('1.09')
  const [history, setHistory] = useState<CalcEntry[]>([])

  const VAT_RATE = 0.21

  const buy = parseFloat(buyEur) || 0
  const sell = parseFloat(sellUsd) || 0
  const qty = Math.max(1, parseInt(quantity) || 1)
  const eurUsd = parseFloat(rate) || 1.09

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setHistory(JSON.parse(saved))
    } catch {}
  }, [])

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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  function clearHistory() {
    setHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  function fmt(n: number, decimals = 2) {
    return n.toLocaleString('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0f0f0f]">
      <div className="max-w-2xl w-full mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-[#00ff88] font-bold text-lg tracking-wide">VAT Calculator</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Buy incl. 21% Dutch VAT → Sell in USD excl. VAT
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">Inputs</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Buy price (EUR incl. 21% VAT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  €
                </span>
                <input
                  type="number"
                  value={buyEur}
                  onChange={(e) => setBuyEur(e.target.value)}
                  placeholder="3449"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Sell price (USD excl. VAT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={sellUsd}
                  onChange={(e) => setSellUsd(e.target.value)}
                  placeholder="3750"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 text-xs mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-500 text-xs mb-1">
                EUR/USD rate{' '}
                <span className="text-yellow-500 text-[10px]">— update manually</span>
              </label>
              <input
                type="number"
                step="0.001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {hasValues && (
          <div className="space-y-3">
            {/* VAT breakdown */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
                Buy breakdown
              </h3>
              <div className="space-y-2">
                <ResultRow label="Buy excl. VAT (per unit)" value={`€ ${fmt(buyExclVat)}`} />
                <ResultRow
                  label={`Buy excl. VAT (× ${qty})`}
                  value={`€ ${fmt(buyExclVat * qty)}`}
                />
                <ResultRow label="VAT per unit (21%)" value={`€ ${fmt(vatPerUnit)}`} />
                <div className="border border-orange-500/30 bg-orange-500/5 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div>
                    <span className="text-orange-400 text-sm font-medium">Total VAT float</span>
                    <span className="text-orange-500/60 text-xs block">
                      Locked capital — reclaimed later
                    </span>
                  </div>
                  <span className="text-orange-400 font-bold text-sm">
                    € {fmt(totalVatFloat)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sell + profit */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
                Sell &amp; profit
              </h3>
              <div className="space-y-2">
                <ResultRow
                  label="Sell price in EUR (per unit)"
                  value={`€ ${fmt(sellEur)}`}
                  sub={`$${fmt(sell)} ÷ ${fmt(eurUsd, 3)}`}
                />

                <div className="h-px bg-[#2a2a2a] my-1" />

                <ResultRow
                  label="Profit BEFORE VAT return (per unit)"
                  value={`€ ${fmt(profitBeforeVatPerUnit)}`}
                  valueColor={profitBeforeVatPerUnit >= 0 ? 'text-gray-300' : 'text-red-400'}
                />
                <ResultRow
                  label={`Profit BEFORE VAT return (× ${qty})`}
                  value={`€ ${fmt(profitBeforeVatTotal)}`}
                  valueColor={profitBeforeVatTotal >= 0 ? 'text-gray-300' : 'text-red-400'}
                />

                <div className="h-px bg-[#2a2a2a] my-1" />

                <ResultRow
                  label="Profit AFTER VAT return (per unit)"
                  value={`€ ${fmt(profitAfterVatPerUnit)}`}
                  valueColor={profitAfterVatPerUnit >= 0 ? 'text-[#00ff88]' : 'text-red-400'}
                  bold
                />
                <ResultRow
                  label={`Profit AFTER VAT return (× ${qty})`}
                  value={`€ ${fmt(profitAfterVatTotal)}`}
                  valueColor={profitAfterVatTotal >= 0 ? 'text-[#00ff88]' : 'text-red-400'}
                  bold
                />

                <div className="h-px bg-[#2a2a2a] my-1" />

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Margin % (after VAT return)</span>
                  <span
                    className={`font-bold text-base ${marginPct >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}
                  >
                    {fmt(marginPct, 1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Save to history button */}
            <button
              onClick={saveToHistory}
              className="w-full py-2.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-sm text-[#00ff88] font-medium hover:bg-[#00ff88]/20 transition-colors"
            >
              Save to History
            </button>
          </div>
        )}

        {!hasValues && (
          <div className="text-center py-10 text-gray-600 text-sm">
            Enter buy and sell prices to see results
          </div>
        )}

        {/* History log */}
        {history.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest">
                History (last {history.length})
              </h3>
              <button
                onClick={clearHistory}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-600 border-b border-[#2a2a2a]">
                    <th className="text-left py-1.5 pr-3 font-medium">Date</th>
                    <th className="text-right py-1.5 pr-3 font-medium">Buy (€)</th>
                    <th className="text-right py-1.5 pr-3 font-medium">Sell ($)</th>
                    <th className="text-right py-1.5 pr-3 font-medium">Qty</th>
                    <th className="text-right py-1.5 pr-3 font-medium">Profit (€)</th>
                    <th className="text-right py-1.5 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, i) => (
                    <tr key={i} className="border-b border-[#2a2a2a]/50 last:border-0">
                      <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                        {fmtDate(entry.date)}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-300 text-right">
                        {fmt(entry.buyEur)}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-300 text-right">
                        {fmt(entry.sellUsd)}
                      </td>
                      <td className="py-1.5 pr-3 text-gray-300 text-right">{entry.qty}</td>
                      <td
                        className={`py-1.5 pr-3 text-right font-medium ${
                          entry.profitAfterVat >= 0 ? 'text-[#00ff88]' : 'text-red-400'
                        }`}
                      >
                        {fmt(entry.profitAfterVat)}
                      </td>
                      <td
                        className={`py-1.5 text-right font-medium ${
                          entry.marginPct >= 0 ? 'text-[#00ff88]' : 'text-red-400'
                        }`}
                      >
                        {fmt(entry.marginPct, 1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultRow({
  label,
  value,
  sub,
  valueColor = 'text-gray-300',
  bold = false,
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-gray-400 text-sm">{label}</span>
        {sub && <span className="text-gray-600 text-xs block">{sub}</span>}
      </div>
      <span className={`${valueColor} text-sm ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}
