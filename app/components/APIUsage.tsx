'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChartSkeleton, CardSkeleton } from './SkeletonLoader'
import { DataUnavailableError } from './ErrorState'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'anthropic' | 'openclaw'
type Timeframe = 'daily' | 'weekly' | 'monthly'

interface CreditsDay {
  date: string
  models: Record<string, number>
  totalCost: number
}

interface CreditsResponse {
  source: string
  days: number
  totalCost: number
  daily: CreditsDay[]
  models: Record<string, number>
  cached_at: string
}

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

// ── OpenClaw Credits Panel ─────────────────────────────────────────────────────

function OpenClawPanel() {
  const [data, setData] = useState<CreditsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchCredits = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/credits?source=openclaw&days=30')
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const result = await res.json()
      setData(result)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch OpenClaw credits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredits()
    const interval = setInterval(fetchCredits, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="bg-[#141414] border border-white/5 rounded-xl p-4">
          <div className="skeleton h-4 w-32 mb-4" />
          <div className="skeleton w-full h-32" />
        </div>
      </div>
    )
  }

  const totalCost = data?.totalCost ?? 0
  const daily = data?.daily ?? []
  const models = data?.models ?? {}
  const modelList = Object.entries(models).sort((a, b) => b[1] - a[1])
  const maxDay = Math.max(...daily.map(d => d.totalCost), 0.0001)
  const visible = daily.slice(-14)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-[#141414] border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-sm">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="text-red-400 font-medium">Failed to load OpenClaw credits</p>
            <p className="text-red-400/60 text-xs mt-0.5">{error} — will retry automatically</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div
        className="rounded-xl p-5 md:p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1a2e 0%, #0f1a1f 50%, #0d1f15 100%)',
          border: '1px solid rgba(0,212,255,0.15)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #00d4ff, transparent 70%)' }} />
        </div>
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">
            OpenClaw Total — 30 days
          </p>
          <div className="flex items-end gap-4 flex-wrap">
            <span className="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">
              ${totalCost.toFixed(4)}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Avg ${(totalCost / 30).toFixed(5)}/day · {daily.length} days with activity
            {lastRefresh && <span> · Updated {lastRefresh.toLocaleTimeString()}</span>}
            {loading && <span className="text-[#00d4ff]/60"> · Refreshing…</span>}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total cost', value: `$${totalCost.toFixed(4)}`, sub: '30 days' },
          { label: 'Active days', value: String(daily.length), sub: 'with usage' },
          { label: 'Avg / day', value: `$${(totalCost / 30).toFixed(5)}`, sub: 'last 30d' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#141414] border border-white/5 rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
            <p className="text-white font-bold text-xl leading-tight">{stat.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {daily.length > 0 && (
        <div className="bg-[#141414] border border-white/5 rounded-xl p-4 md:p-5">
          <h2 className="text-white text-sm font-medium mb-4">Daily spend</h2>
          <div className="flex items-end gap-1 h-32">
            {visible.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
                    <div className="text-white font-semibold mb-1">{formatDate(d.date)}</div>
                    <div className="text-[#00d4ff]">${d.totalCost.toFixed(5)}</div>
                  </div>
                </div>
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.max((d.totalCost / maxDay) * 112, 2)}px`,
                    backgroundColor: '#00d4ff',
                    opacity: 0.75,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            {visible.map((d, i) => (
              <div key={i} className="flex-1 min-w-0 text-center overflow-hidden">
                {i % 2 === 0 && (
                  <span className="text-[10px] text-gray-600 leading-none block truncate">
                    {formatDate(d.date).split(' ')[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-model breakdown */}
      {modelList.length > 0 && (
        <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-4 md:px-5 py-3 border-b border-white/5">
            <h2 className="text-white text-sm font-medium">Breakdown by model</h2>
          </div>
          <div className="divide-y divide-white/5">
            {modelList.map(([model, cost]) => {
              const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0
              return (
                <div key={model} className="px-4 md:px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#00d4ff]" />
                    <span className="text-white text-sm font-medium flex-1">{model}</span>
                    <span className="text-white font-semibold text-sm">${cost.toFixed(5)}</span>
                    <span className="text-gray-500 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: '#00d4ff', opacity: 0.7 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-4 md:px-5 py-3 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
            <span className="text-gray-400 text-sm">Total (30 days)</span>
            <span className="text-[#00d4ff] font-bold">${totalCost.toFixed(5)}</span>
          </div>
        </div>
      )}

      {daily.length === 0 && !loading && !error && (
        <div className="bg-[#141414] border border-white/5 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No OpenClaw cost data yet.</p>
          <p className="text-gray-600 text-xs mt-1">Run the sync script to push session costs from your Mac mini.</p>
        </div>
      )}

      {data && !error && (
        <div className="bg-[#141414] border border-[#00d4ff]/10 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
          <span className="text-[#00d4ff] font-medium">Live</span>{' '}
          Refreshes every 60s · Source: openclaw · Last sync: {data.cached_at ? new Date(data.cached_at).toLocaleTimeString() : '—'}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function APIUsage() {
  const [activeTab, setActiveTab] = useState<Tab>('anthropic')
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
      
      // Check if API returned an error field (Anthropic endpoint unavailable)
      if (result.error === 'anthropic_endpoint_unavailable') {
        setError(result.message || 'Anthropic endpoint not available')
        setData(result) // Still set data for display consistency
      } else {
        setData(result)
        setError(null)
      }
      setLastRefresh(new Date())
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

  // Trend: compare last 7 days vs prior 7 days
  const trend = useMemo(() => {
    if (!data?.daily || data.daily.length < 2) return null
    const sorted = [...data.daily].sort((a, b) => a.date.localeCompare(b.date))
    const last7 = sorted.slice(-7).reduce((s, d) => s + d.totalCost, 0)
    const prior7 = sorted.slice(-14, -7).reduce((s, d) => s + d.totalCost, 0)
    if (prior7 === 0) return null
    const pct = ((last7 - prior7) / prior7) * 100
    return { pct, up: pct > 0 }
  }, [data])

  // Full skeleton while no data yet
  if (loading && !data) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="space-y-1.5">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-3 w-44" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-7 w-16" />
              <div className="skeleton h-2.5 w-12" />
            </div>
          ))}
        </div>
        <div className="bg-[#141414] border border-white/5 rounded-xl p-4 md:p-5">
          <div className="skeleton h-4 w-32 mb-4" />
          <div className="skeleton w-full h-32" />
        </div>
        <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

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
              {activeTab === 'anthropic' && lastRefresh && <span> · Updated {lastRefresh.toLocaleTimeString()}</span>}
              {activeTab === 'anthropic' && loading && <span className="text-[#00ff88]/60"> · Refreshing…</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Source tab toggle */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('anthropic')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                activeTab === 'anthropic' ? 'bg-[#00ff88]/15 text-[#00ff88]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Anthropic
            </button>
            <button
              onClick={() => setActiveTab('openclaw')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                activeTab === 'openclaw' ? 'bg-[#00d4ff]/15 text-[#00d4ff]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              OpenClaw
            </button>
          </div>

          {/* Timeframe toggle — Anthropic only */}
          {activeTab === 'anthropic' && (
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
          )}
        </div>
      </div>

      {/* OpenClaw tab */}
      {activeTab === 'openclaw' && <OpenClawPanel />}

      {/* Anthropic tab content */}
      {activeTab === 'anthropic' && <>

      {/* Error banner */}
      {error && (
        <div className="bg-[#141414] border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-sm">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="text-red-400 font-medium">Anthropic API usage endpoint not available</p>
            <p className="text-red-400/60 text-xs mt-0.5">Note: Anthropic does not expose /v1/usage endpoint. See billing dashboard at https://console.anthropic.com for actual usage data.</p>
          </div>
        </div>
      )}

      {/* Manual credit input fallback */}
      {!data && !loading && !error && (
        <div className="bg-[#141414] border border-[#00ff88]/20 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-white text-sm font-semibold mb-2">No API Data Available</h3>
            <p className="text-gray-500 text-xs mb-4">
              The Anthropic /v1/usage endpoint is not publicly available. 
              <br />
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-[#00ff88] hover:underline">
                Check your actual usage at https://console.anthropic.com →
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Hero: Total Spend */}
      <div
        className="rounded-xl p-5 md:p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d1f15 0%, #0f1a2e 50%, #1a0d2e 100%)',
          border: '1px solid rgba(0,255,136,0.15)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #00ff88, transparent 70%)' }} />
          <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />
        </div>
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#00ff88]/70 mb-2">
            Total Spend — 30 days
          </p>
          <div className="flex items-end gap-4 flex-wrap">
            <span className="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">
              ${grandTotal.toFixed(2)}
            </span>
            {trend && (
              <span
                className={`flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full mb-1 ${
                  trend.up ? 'text-red-400 bg-red-400/10' : 'text-[#00ff88] bg-[#00ff88]/10'
                }`}
              >
                {trend.up ? '↑' : '↓'} {Math.abs(trend.pct).toFixed(1)}% vs prior 7d
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Avg ${(grandTotal / 30).toFixed(4)}/day · {fmtTokens(totalInput + totalOutput)} total tokens
          </p>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
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

      {/* Live status note */}
      {data && !error && (
        <div className="bg-[#141414] border border-[#00ff88]/10 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
          <span className="text-[#00ff88] font-medium">Live</span>{' '}
          Refreshes every 30s · Range: {data.start_date} → {data.end_date}
          {lastRefresh && <span> · Last update: {lastRefresh.toLocaleTimeString()}</span>}
        </div>
      )}

      </>}
    </div>
  )
}
