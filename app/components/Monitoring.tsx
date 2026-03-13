'use client'

import { useState, useEffect, useCallback } from 'react'

interface HostMetrics {
  name: string
  hostid: string
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

interface HostDetail {
  hostid: string
  isMac: boolean
  sysInfo: { uname: string; hostname: string; version: string }
  cpuModes: Record<string, number>
  loadAvg: { avg1: number; avg5: number; avg15: number }
  processes: { total: number; running: number; cpuCount: number }
  swap: { total: number; free: number; used: number; percent: number } | null
  netInterfaces: Array<{ name: string; rxMB: number; txMB: number }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function BarMeter({ percent, thresholdWarn = 70, thresholdCrit = 90 }: { percent: number; thresholdWarn?: number; thresholdCrit?: number }) {
  const color = percent >= thresholdCrit ? '#ef4444' : percent >= thresholdWarn ? '#f97316' : '#00ff88'
  return (
    <div className="relative w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }} />
    </div>
  )
}

function MetricRow({ label, percent, detail, thresholdWarn, thresholdCrit }: { label: string; percent: number; detail: string; thresholdWarn?: number; thresholdCrit?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400 flex items-center gap-1">
          {label}
          {percent >= 80 && <span title="High usage">⚠️</span>}
        </span>
        <span className="text-gray-300 tabular-nums">{detail}</span>
      </div>
      <BarMeter percent={percent} thresholdWarn={thresholdWarn} thresholdCrit={thresholdCrit} />
    </div>
  )
}

// ── Host card ─────────────────────────────────────────────────────────────────

function HostCard({ host, onClick }: { host: HostMetrics; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4 hover:border-[#3a3a3a] hover:bg-[#1e1e1e] transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <span className="text-gray-200 font-semibold text-sm">{host.icon ?? '🖥'} {host.name}</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${host.online ? 'bg-[#00ff88]' : 'bg-red-500'}`} />
          <span className={`text-xs ${host.online ? 'text-[#00ff88]' : 'text-red-400'}`}>
            {host.online ? 'Online' : 'Offline'}
          </span>
          <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {host.online ? (
        <div className="space-y-3">
          <MetricRow label="CPU" percent={host.cpu} detail={`${host.cpu.toFixed(1)}%`} />
          <MetricRow label="RAM" percent={host.ram.percent} detail={`${host.ram.used} / ${host.ram.total} GB (${host.ram.percent.toFixed(1)}%)`} thresholdWarn={70} thresholdCrit={90} />
          <MetricRow label="Disk" percent={host.disk.percent} detail={`${host.disk.used} / ${host.disk.total} GB (${host.disk.percent.toFixed(1)}%)`} thresholdWarn={80} thresholdCrit={90} />
          <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2a]">
            <span className="text-xs text-gray-500">Uptime</span>
            <span className="text-xs text-gray-400">{host.uptime}</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 py-4 text-center">Host unreachable</div>
      )}
    </button>
  )
}

// ── Detail drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({ host, onClose }: { host: HostMetrics; onClose: () => void }) {
  const [detail, setDetail] = useState<HostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/monitoring/detail/${host.hostid}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [host.hostid])

  const CPU_COLORS: Record<string, string> = {
    user: '#00ff88', system: '#3b82f6', iowait: '#f97316',
    softirq: '#a855f7', steal: '#ef4444', nice: '#06b6d4', idle: '#2a2a2a',
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[#141414] border-l border-[#2a2a2a] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-200">{host.icon ?? '🖥'} {host.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${host.online ? 'bg-[#00ff88]' : 'bg-red-500'}`} />
              <span className={`text-xs ${host.online ? 'text-[#00ff88]' : 'text-red-400'}`}>{host.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-400 bg-red-950/30 rounded-lg p-3">{error}</div>
          ) : detail ? (
            <>
              {/* System info */}
              {detail.sysInfo.uname && (
                <section>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">System</p>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">OS</span>
                      <span className="text-gray-300 text-right max-w-[200px] truncate">{detail.sysInfo.uname.split(' ').slice(0, 3).join(' ')}</span>
                    </div>
                    {detail.sysInfo.hostname && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Hostname</span>
                        <span className="text-gray-300">{detail.sysInfo.hostname}</span>
                      </div>
                    )}
                    {detail.processes.cpuCount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">CPU cores</span>
                        <span className="text-gray-300">{detail.processes.cpuCount}</span>
                      </div>
                    )}
                    {detail.sysInfo.version && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Agent</span>
                        <span className="text-gray-300">v{detail.sysInfo.version}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* CPU breakdown */}
              {Object.keys(detail.cpuModes).length > 0 && (
                <section>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">CPU Breakdown</p>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                    {Object.entries(detail.cpuModes)
                      .filter(([k]) => k !== 'idle')
                      .sort(([, a], [, b]) => b - a)
                      .map(([mode, val]) => (
                        <div key={mode} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400 capitalize">{mode}</span>
                            <span className="text-gray-300 tabular-nums">{val.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(val, 100)}%`, backgroundColor: CPU_COLORS[mode] ?? '#6b7280' }} />
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* Load average */}
              <section>
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Load Average</p>
                <div className="bg-[#1a1a1a] rounded-lg p-3 grid grid-cols-3 gap-3 text-center">
                  {[['1m', detail.loadAvg.avg1], ['5m', detail.loadAvg.avg5], ['15m', detail.loadAvg.avg15]].map(([label, val]) => (
                    <div key={label as string}>
                      <p className="text-lg font-mono text-gray-200">{(val as number).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Processes */}
              {detail.processes.total > 0 && (
                <section>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Processes</p>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-lg font-mono text-gray-200">{detail.processes.total}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-mono text-[#00ff88]">{detail.processes.running}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Running</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Swap */}
              {detail.swap && (
                <section>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Swap</p>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Used</span>
                      <span className="text-gray-300">{detail.swap.used} / {detail.swap.total} GB ({detail.swap.percent.toFixed(1)}%)</span>
                    </div>
                    <BarMeter percent={detail.swap.percent} thresholdWarn={50} thresholdCrit={80} />
                  </div>
                </section>
              )}

              {/* Network */}
              {detail.netInterfaces.length > 0 && (
                <section>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Network</p>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-2">
                    {detail.netInterfaces.map(iface => (
                      <div key={iface.name} className="space-y-1">
                        <p className="text-xs text-gray-500 font-mono">{iface.name}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-blue-400">↓</span>
                            <span className="text-gray-300 tabular-nums">{iface.rxMB} MB</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#00ff88]">↑</span>
                            <span className="text-gray-300 tabular-nums">{iface.txMB} MB</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Monitoring() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedHost, setSelectedHost] = useState<HostMetrics | null>(null)

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
              <HostCard key={host.name} host={host} onClick={() => setSelectedHost(host)} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Detail drawer */}
      {selectedHost && (
        <DetailDrawer host={selectedHost} onClose={() => setSelectedHost(null)} />
      )}
    </div>
  )
}
