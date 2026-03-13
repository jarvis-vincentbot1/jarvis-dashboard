'use client'

import { useState, useEffect, useCallback } from 'react'

interface HostMetrics {
  name: string
  icon?: string
  online: boolean
  cpu: number
  ram: { used: number; total: number; percent: number }
  disk: { used: number; total: number; percent: number }
  uptime: string
}

interface MonitoringData {
  hosts: HostMetrics[]
  source?: string
}

function BarMeter({
  percent,
  thresholdWarn = 70,
  thresholdCrit = 90,
}: {
  percent: number
  thresholdWarn?: number
  thresholdCrit?: number
}) {
  const color =
    percent >= thresholdCrit
      ? '#ef4444'
      : percent >= thresholdWarn
      ? '#f97316'
      : '#00ff88'

  return (
    <div className="relative w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

function MetricRow({
  label,
  percent,
  detail,
  thresholdWarn,
  thresholdCrit,
}: {
  label: string
  percent: number
  detail: string
  thresholdWarn?: number
  thresholdCrit?: number
}) {
  const warn = thresholdWarn ?? 70
  const crit = thresholdCrit ?? 90
  const over80 = percent >= 80

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400 flex items-center gap-1">
          {label}
          {over80 && <span title="High usage">⚠️</span>}
        </span>
        <span className="text-gray-300 tabular-nums">{detail}</span>
      </div>
      <BarMeter percent={percent} thresholdWarn={warn} thresholdCrit={crit} />
    </div>
  )
}

function HostCard({ host }: { host: HostMetrics }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-200 font-semibold text-sm">{host.icon ?? '🖥'} {host.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${host.online ? 'bg-[#00ff88]' : 'bg-red-500'}`}
          />
          <span className={`text-xs ${host.online ? 'text-[#00ff88]' : 'text-red-400'}`}>
            {host.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {host.online ? (
        <div className="space-y-3">
          <MetricRow
            label="CPU"
            percent={host.cpu}
            detail={`${host.cpu.toFixed(1)}%`}
          />
          <MetricRow
            label="RAM"
            percent={host.ram.percent}
            detail={`${host.ram.used} / ${host.ram.total} GB (${host.ram.percent.toFixed(1)}%)`}
            thresholdWarn={70}
            thresholdCrit={90}
          />
          <MetricRow
            label="Disk"
            percent={host.disk.percent}
            detail={`${host.disk.used} / ${host.disk.total} GB (${host.disk.percent.toFixed(1)}%)`}
            thresholdWarn={80}
            thresholdCrit={90}
          />
          <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2a]">
            <span className="text-xs text-gray-500">Uptime</span>
            <span className="text-xs text-gray-400">{host.uptime}</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 py-4 text-center">Host unreachable</div>
      )}
    </div>
  )
}

export default function Monitoring() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-200">System Monitoring</h1>
              <span className="text-[10px] text-gray-600 border border-[#2a2a2a] rounded px-1.5 py-0.5">Zabbix</span>
            </div>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-0.5">
                Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 30s
              </p>
            )}
          </div>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="px-3 py-1.5 text-xs text-gray-400 border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] hover:text-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Content */}
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-sm text-red-400">
            Error: {error}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.hosts.map((host) => (
              <HostCard key={host.name} host={host} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
