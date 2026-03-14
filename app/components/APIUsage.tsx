'use client'

import { useState, useMemo, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Timeframe = 'daily' | 'weekly' | 'monthly'

interface DailyUsage {
  date: string // YYYY-MM-DD
  engines: Record<string, { inputTokens: number; outputTokens: number; cost: number }>
  totalCost: number
}

interface UsageResponse {
  start_date: string
  end_date: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  daily: DailyUsage[]
  engines: Record<string, { cost: number; inputTokens: number; outputTokens: number }>
  cached_at: string
}

// ── Engine Config ─────────────────────────────────────────────────────────────

const ENGINES: { id: string; label: string; color: string; inputRate: number; outputRate: number }[] = [
  { id: 'claude-haiku',    label: 'Claude Haiku',   color: '#00ff88', inputRate: 0.80,   outputRate: 4.00   },
  { id: 'claude-sonnet',   label: 'Claude Sonnet',  color: '#00d4ff', inputRate: 3.00,   outputRate: 15.00  },
  { id: 'claude-opus',     label: 'Claude Opus',    color: '#a855f7', inputRate: 15.00,  outputRate: 75.00  },
]

// ── Helper Functions ──────────────────────────────────────────────────────────

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getWeekKey(date: string) {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0
  const mon = new Date(d)
  mon.setDate(d.getDate() - day)
  return mon.toISOString().slice(0, 10)
}

function getMonthKey(date: string) {
  return date.slice(0, 7)
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

interface BucketEntry {
  label: string
  totalCost: number
  engines: Record<string, number> // engineId -> cost
  inputTokens: number
  outputTokens: number
}

function aggregateData(data: DailyUsage[], timeframe: Timeframe): BucketEntry[] {
  const buckets: Record<string, BucketEntry> = {}

  for (const day of data) {
    let key: string
    let label: string

    if (timeframe === 'daily') {
      key = day.date
      label = formatDate(day.date)
    } else if (timeframe === 'weekly') {
      key = getWeekKey(day.date)
      const end = new Date(key + 'T00:00:00')
      end.setDate(end.getDate() + 6)
      label = `${formatDate(key)}–${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    } else {
      key = getMonthKey(day.date)
      label = new Date(key + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    }

    if (!buckets[key]) {
      buckets[key] = { label, totalCost: 0, engines: {}, inputTokens: 0, outputTokens: 0 }
    }

    for (const [engineId, usage] of Object.entries(day.engines)) {
      buckets[key].totalCost += usage.cost
      buckets[key].engines[engineId] = (buckets[key].engines[engineId] ?? 0) + usage.cost
      buckets[key].inputTokens += usage.inputTokens
      buckets[key].outputTokens += usage.outputTokens
    }
  }

  return Object.values(buckets).sort((a, b) => {
    // Sort by date embedded in label (first date always comes first in our format)
    return a.label.localeCompare(b.label)
  })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function UsageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({ buckets, timeframe }: { buckets: BucketEntry[]; timeframe: Timeframe }) {
  const maxCost = Math.max(...buckets.map(b => b.totalCost), 0.001)
  // Show only last N buckets to fit
  const visible = timeframe === 'daily' ? buckets.slice(-14) : timeframe === 'weekly' ? buckets.slice(-8) : buckets

  return (
    <div className="w-full">
      {/* Chart bars */}
      <div className="flex items-end gap-1 h-32" style={{ minHeight: 128 }}>
        {visible.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
                <div className="text-white font-semibold mb-1">{b.label}</div>
                <div className="text-[#00ff88]">${b.totalCost.toFixed(4)}</div>
                {ENGINES.filter(e => b.engines[e.id] > 0).map(e => (
                  <div key={e.id} className="text-gray-400 mt-0.5">
                    <span style={{ color: e.color }}>{e.label}:</span> ${(b.engines[e.id] ?? 0).toFixed(4)}
                  </div>
                ))}
              </div>
            </div>
            {/* Stacked bar */}
            <div
              className="w-full rounded-sm overflow-hidden flex flex-col-reverse"
              style={{ height: `${Math.max((b.totalCost / maxCost) * 112, 2)}px` }}
            >
              {ENGINES.filter(e => (b.engines[e.id] ?? 0) > 0).map(e => (
                <div
                  key={e.id}
                  style={{
                    backgroundColor: e.color,
                    height: `${((b.engines[e.id] ?? 0) / b.totalCost) * 100}%`,
                    opacity: 0.85,
                    minHeight: 2,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* X labels — show every Nth */}
      <div className="flex gap-1 mt-2">
        {visible.map((b, i) => {
          const step = timeframe === 'daily' ? 2 : 1
          return (
            <div key={i} className="flex-1 min-w-0 text-center overflow-hidden">
              {i % step === 0 && (
                <span className="text-[10px] text-gray-600 leading-none block truncate">
                  {timeframe === 'daily' ? b.label.split(' ')[0] : timeframe === 'weekly' ? b.label.split('–')[0] : b.label.split(' ')[0]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function APIUsage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('daily')
  const [data, setData] = useState<UsageResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Fetch usage data
  const fetchUsageData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/usage')
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      const result = await res.json()
      setData(result)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data')
      console.error('Usage fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount and set up 30-second refresh
  useEffect(() => {
    fetchUsageData()
    const interval = setInterval(fetchUsageData, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [])

  const buckets = useMemo(() => {
    if (!data?.daily) return []
    return aggregateData(data.daily, timeframe)
  }, [data, timeframe])

  const totalSpend = useMemo(() => buckets.reduce((s, b) => s + b.totalCost, 0), [buckets])
  const totalInput = useMemo(() => data?.input_tokens ?? 0, [data])
  const totalOutput = useMemo(() => data?.output_tokens ?? 0, [data])
  const engineTotals = useMemo(() => data?.engines ?? {}, [data])
  const grandTotal = useMemo(() => data?.cost_usd ?? 0, [data])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88]">
            <UsageIcon />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">API Usage</h1>
            <p className="text-gray-500 text-xs">
              30-day window · Live tracking
              {lastRefresh && <span> · Updated {lastRefresh.toLocaleTimeString()}</span>}
              {loading && <span className="animate-pulse"> · Refreshing...</span>}
            </p>
          </div>
        </div>

        {/* Timeframe toggle */}
        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/5 rounded-lg p-1">
          {(['daily', 'weekly', 'monthly'] as Timeframe[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 capitalize ${
                timeframe === tf
                  ? 'bg-[#00ff88]/15 text-[#00ff88]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total spend', value: `$${totalSpend.toFixed(2)}`, sub: '30 days' },
          { label: 'Input tokens', value: fmtTokens(totalInput), sub: 'all engines' },
          { label: 'Output tokens', value: fmtTokens(totalOutput), sub: 'all engines' },
          { label: 'Avg / day', value: `$${(grandTotal / 30).toFixed(3)}`, sub: 'last 30d' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#141414] border border-white/5 rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
            <p className="text-white font-bold text-xl leading-tight">{stat.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-[#141414] border border-white/5 rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-sm font-medium">Spend over time</h2>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {ENGINES.filter(e => engineTotals[e.id]).map(e => (
              <div key={e.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                <span className="text-gray-500 text-xs">{e.label}</span>
              </div>
            ))}
          </div>
        </div>
        <BarChart buckets={buckets} timeframe={timeframe} />
      </div>

      {/* Per-engine breakdown */}
      <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-white/5">
          <h2 className="text-white text-sm font-medium">Breakdown by engine</h2>
        </div>
        <div className="divide-y divide-white/5">
          {ENGINES.filter(e => engineTotals[e.id]).sort((a, b) => (engineTotals[b.id]?.cost ?? 0) - (engineTotals[a.id]?.cost ?? 0)).map(engine => {
            const usage = engineTotals[engine.id]
            const pct = (usage.cost / grandTotal) * 100
            return (
              <div key={engine.id} className="px-4 md:px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: engine.color }} />
                  <span className="text-white text-sm font-medium flex-1">{engine.label}</span>
                  <span className="text-white font-semibold text-sm">${usage.cost.toFixed(4)}</span>
                  <span className="text-gray-500 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
                {/* Progress bar */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: engine.color, opacity: 0.7 }}
                  />
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-gray-600 text-xs">{fmtTokens(usage.inputTokens)} in</span>
                  <span className="text-gray-600 text-xs">{fmtTokens(usage.outputTokens)} out</span>
                  <span className="text-gray-600 text-xs">${engine.inputRate}/K in · ${engine.outputRate}/K out</span>
                </div>
              </div>
            )
          })}
        </div>
        {/* Footer total */}
        <div className="px-4 md:px-5 py-3 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
          <span className="text-gray-400 text-sm">Total (30 days)</span>
          <span className="text-[#00ff88] font-bold">${grandTotal.toFixed(4)}</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-[#141414] border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="bg-[#141414] border border-white/5 rounded-xl p-8 text-center text-gray-500">
          <div className="animate-pulse">Loading usage data...</div>
        </div>
      )}

      {/* Live status note */}
      {data && !error && (
        <div className="bg-[#141414] border border-[#00ff88]/10 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
          <span className="text-[#00ff88] font-medium">Live Tracking:</span>{' '}
          Data refreshes every 30 seconds from Anthropic API. Range: {data.start_date} to {data.end_date}.
          Last updated: {lastRefresh?.toLocaleTimeString() || 'loading...'}
        </div>
      )}
    </div>
  )
}
