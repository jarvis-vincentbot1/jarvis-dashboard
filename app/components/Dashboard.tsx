'use client'

import { useEffect, useState } from 'react'

interface Chat {
  id: string
  name: string
  projectId: string | null
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
  lastMessage?: { role: string; content: string; createdAt: string } | null
}

interface Props {
  allChats: Chat[]
  onOpenChat: (id: string) => void
  onNavChange?: (nav: string) => void
}

interface ModelHealth {
  ok: boolean
  latencyMs: number
  error?: string
}

interface StatusData {
  openclaw: { online: boolean; latencyMs: number }
  haiku: ModelHealth
  sonnet: ModelHealth
  checkedAt: string
}

interface UsageData {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  cost_usd?: number
  error?: string
}

interface Todo {
  id: string
  done: boolean
}

interface PriceEntry {
  price: number
  inStock: boolean
  retailer: string
  country: string
  url: string
  scrapedAt: string
}

interface Product {
  id: string
  name: string
  entries: PriceEntry[]
}

interface ServerHost {
  name: string
  icon?: string
  online: boolean
  cpu: number
  ram: { percent: number }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

function fmtCost(usd: number) {
  if (usd < 0.01) return `$${(usd * 100).toFixed(3)}¢`
  return `$${usd.toFixed(4)}`
}

function modelLabel(model: string) {
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('opus')) return 'Opus'
  if (model.includes('qwen')) return model.replace('ollama/', '').split(':')[0]
  return model.split('/').pop() ?? model
}

const COUNTRY_FLAGS: Record<string, string> = {
  NL: '🇳🇱', DE: '🇩🇪', FR: '🇫🇷', GB: '🇬🇧',
  ES: '🇪🇸', BE: '🇧🇪', AT: '🇦🇹', IT: '🇮🇹', EU: '🇪🇺',
}

// ── Widget shell ──────────────────────────────────────────────────────────────

function Widget({ title, dot, children, onClick }: {
  title: string
  dot?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#141414] border border-white/[0.06] rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-white/10 hover:bg-[#181818] transition-colors' : ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />}
        <h2 className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── AI Status widget ──────────────────────────────────────────────────────────

function AIStatusWidget() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => setStatus(d))
      .catch(() => {})
  }, [])

  async function recheck() {
    setChecking(true)
    try {
      const res = await fetch('/api/status', { method: 'POST' })
      if (res.ok) setStatus(await res.json())
    } catch {}
    setChecking(false)
  }

  function ModelRow({ label, health, modelId }: { label: string; health: ModelHealth | undefined; modelId: string }) {
    if (!health) return null
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${health.ok ? 'bg-[#00ff88]' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-300">{label}</span>
          <span className="text-[10px] text-gray-600 font-mono">{modelId.split('/').pop()}</span>
        </div>
        <div className="text-right">
          {health.ok
            ? <span className="text-xs text-[#00ff88]">{health.latencyMs}ms</span>
            : <span className="text-xs text-red-400">{health.error ?? 'down'}</span>
          }
        </div>
      </div>
    )
  }

  return (
    <Widget title="AI Status" dot="#a855f7">
      {status === null ? (
        <div className="space-y-2.5">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-px w-full" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* OpenClaw */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.openclaw.online ? 'bg-[#00ff88] shadow-[0_0_4px_#00ff88]' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-300">OpenClaw Gateway</span>
            </div>
            <span className={`text-xs ${status.openclaw.online ? 'text-[#00ff88]' : 'text-red-400'}`}>
              {status.openclaw.online ? `${status.openclaw.latencyMs}ms` : 'offline'}
            </span>
          </div>

          <div className="h-px bg-[#2a2a2a]" />

          <ModelRow label="Haiku" health={status.haiku} modelId="claude-haiku-4-5-20251001" />
          <ModelRow label="Sonnet" health={status.sonnet} modelId="claude-sonnet-4-6" />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-gray-600">
              {status.checkedAt ? `Checked ${timeAgo(status.checkedAt)}` : ''}
            </span>
            <button
              onClick={recheck}
              disabled={checking}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              {checking ? 'Checking…' : 'Re-check'}
            </button>
          </div>
        </div>
      )}
    </Widget>
  )
}

// ── Usage widget ──────────────────────────────────────────────────────────────

function UsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.ok ? r.json() : null)
      .then(d => setUsage(d ?? { error: 'unavailable' }))
      .catch(() => setUsage({ error: 'unavailable' }))
  }, [])

  return (
    <Widget title="Claude Usage — Today" dot="#a855f7">
      {usage === null ? (
        <div className="space-y-2.5">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-px w-full" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ) : usage.error ? (
        <p className="text-sm text-gray-600 italic">Usage data unavailable</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Input</span>
            <span className="text-sm font-mono text-gray-200">
              {usage.input_tokens != null ? fmtTokens(usage.input_tokens) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Output</span>
            <span className="text-sm font-mono text-gray-200">
              {usage.output_tokens != null ? fmtTokens(usage.output_tokens) : '—'}
            </span>
          </div>
          {usage.total_tokens != null && (
            <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2a]">
              <span className="text-xs text-gray-500">Total tokens</span>
              <span className="text-sm font-mono text-purple-400">{fmtTokens(usage.total_tokens)}</span>
            </div>
          )}
          {usage.cost_usd != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Est. cost</span>
              <span className="text-sm font-mono text-yellow-400">{fmtCost(usage.cost_usd)}</span>
            </div>
          )}
        </div>
      )}
    </Widget>
  )
}

// ── Quick stats ───────────────────────────────────────────────────────────────

function QuickStat({ value, label, color, onClick }: {
  value: string | number | null
  label: string
  color: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#141414] border border-white/[0.06] rounded-xl p-3 text-center ${onClick ? 'cursor-pointer hover:border-white/10 hover:bg-[#181818] transition-colors group' : ''}`}
    >
      {value === null ? (
        <>
          <div className="skeleton h-7 w-12 mx-auto mb-1.5" />
          <div className="skeleton h-2.5 w-16 mx-auto" />
        </>
      ) : (
        <>
          <div className="text-xl font-bold tabular-nums transition-transform group-hover:scale-105" style={{ color }}>{value}</div>
          <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</div>
        </>
      )}
    </div>
  )
}

function QuickStatsRow({ allChats, onNavChange }: { allChats: Chat[]; onNavChange?: (nav: string) => void }) {
  const [todoCount, setTodoCount] = useState<number | null>(null)
  const [hwCount, setHwCount] = useState<number | null>(null)
  const [serverStatus, setServerStatus] = useState<{ online: number; total: number } | null>(null)

  useEffect(() => {
    // Open todos
    fetch('/api/todos')
      .then(r => r.ok ? r.json() : [])
      .then((data: Todo[]) => setTodoCount(data.filter((t) => !t.done).length))
      .catch(() => setTodoCount(0))

    // Tracked hardware products
    fetch('/api/prices')
      .then(r => r.ok ? r.json() : { products: [] })
      .then((data: { products: Product[] }) => setHwCount(data.products?.length ?? 0))
      .catch(() => setHwCount(0))

    // Server health
    fetch('/api/monitoring')
      .then(r => r.ok ? r.json() : { hosts: [] })
      .then((data: { hosts: ServerHost[] }) => {
        const hosts = data.hosts ?? []
        setServerStatus({ online: hosts.filter((h) => h.online).length, total: hosts.length })
      })
      .catch(() => setServerStatus({ online: 0, total: 0 }))
  }, [])

  const allOnline = serverStatus != null && serverStatus.online === serverStatus.total && serverStatus.total > 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <QuickStat
        value={todoCount}
        label="Open tasks"
        color="#00ff88"
        onClick={() => onNavChange?.('todo')}
      />
      <QuickStat
        value={allChats.length}
        label="Chats"
        color="#3b82f6"
        onClick={() => onNavChange?.('chat')}
      />
      <QuickStat
        value={hwCount}
        label="Hardware"
        color="#f97316"
        onClick={() => onNavChange?.('prices')}
      />
      <QuickStat
        value={serverStatus == null ? null : `${serverStatus.online}/${serverStatus.total}`}
        label="Servers"
        color={allOnline ? '#00ff88' : '#ef4444'}
        onClick={() => onNavChange?.('monitoring')}
      />
    </div>
  )
}

// ── Best price widget ─────────────────────────────────────────────────────────

function BestPriceWidget({ onNavChange }: { onNavChange?: (nav: string) => void }) {
  const [best, setBest] = useState<{ product: string; entry: PriceEntry } | null | 'loading' | 'empty'>('loading')

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.ok ? r.json() : { products: [] })
      .then((data: { products: Product[] }) => {
        // Find cheapest in-stock entry across all products
        let bestProduct = ''
        let bestEntry: PriceEntry | null = null
        for (const p of data.products ?? []) {
          for (const e of p.entries) {
            if (e.inStock && (!bestEntry || e.price < bestEntry.price)) {
              bestEntry = e
              bestProduct = p.name
            }
          }
        }
        if (bestEntry) setBest({ product: bestProduct, entry: bestEntry })
        else setBest('empty')
      })
      .catch(() => setBest('empty'))
  }, [])

  if (best === 'loading') {
    return (
      <Widget title="Best Price" dot="#f97316">
        <div className="flex items-center gap-2 py-1">
          <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-600">Loading…</span>
        </div>
      </Widget>
    )
  }

  if (best === 'empty' || best === null) {
    return (
      <Widget title="Best Price" dot="#f97316" onClick={() => onNavChange?.('prices')}>
        <p className="text-sm text-gray-600 italic">No tracked products — add one in Hardware</p>
      </Widget>
    )
  }

  return (
    <Widget title="Best Price" dot="#f97316">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-gray-500 truncate mb-0.5">{best.product}</div>
          <div className="text-sm text-gray-300 font-medium truncate">{best.entry.retailer}</div>
          <div className="text-xs text-gray-600 mt-0.5">
            {COUNTRY_FLAGS[best.entry.country] ?? '🌐'} {best.entry.country} · {timeAgo(best.entry.scrapedAt)}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-[#f97316] tabular-nums">
            €{Math.round(best.entry.price).toLocaleString('nl-NL')}
          </div>
          <div className="text-xs text-[#00ff88] mt-0.5">✅ In stock</div>
          <a
            href={best.entry.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-orange-400/60 hover:text-orange-400 transition-colors mt-0.5 inline-block"
          >
            View →
          </a>
        </div>
      </div>
    </Widget>
  )
}

// ── Server overview mini widget ───────────────────────────────────────────────

function ServerOverviewWidget({ onNavChange }: { onNavChange?: (nav: string) => void }) {
  const [hosts, setHosts] = useState<ServerHost[] | null>(null)

  useEffect(() => {
    fetch('/api/monitoring')
      .then(r => r.ok ? r.json() : { hosts: [] })
      .then((d: { hosts: ServerHost[] }) => setHosts(d.hosts ?? []))
      .catch(() => setHosts([]))
  }, [])

  return (
    <Widget title="Servers" dot="#3b82f6" onClick={() => onNavChange?.('monitoring')}>
      {hosts === null ? (
        <div className="space-y-2.5">
          <div className="skeleton h-3.5 w-3/4" />
          <div className="skeleton h-1 w-full" />
          <div className="skeleton h-3.5 w-2/3" />
          <div className="skeleton h-1 w-full" />
        </div>
      ) : hosts.length === 0 ? (
        <p className="text-sm text-gray-600 italic">No hosts</p>
      ) : (
        <div className="space-y-2.5">
          {hosts.map((host) => (
            <div key={host.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${host.online ? 'bg-[#00ff88]' : 'bg-red-500'}`} />
                  <span className="text-gray-300">{host.icon ?? '🖥'} {host.name}</span>
                </div>
                {host.online && (
                  <span className="text-gray-500">CPU {host.cpu.toFixed(0)}% · RAM {host.ram.percent.toFixed(0)}%</span>
                )}
              </div>
              {host.online && (
                <div className="flex gap-1 h-1">
                  <div className="flex-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(host.cpu, 100)}%`, backgroundColor: host.cpu > 90 ? '#ef4444' : host.cpu > 70 ? '#f97316' : '#3b82f6' }}
                    />
                  </div>
                  <div className="flex-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(host.ram.percent, 100)}%`, backgroundColor: host.ram.percent > 90 ? '#ef4444' : host.ram.percent > 70 ? '#f97316' : '#00ff88' }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Widget>
  )
}

// ── Recent chats ──────────────────────────────────────────────────────────────

function RecentChats({ allChats, onOpenChat }: { allChats: Chat[]; onOpenChat: (id: string) => void }) {
  const recent = [...allChats]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  if (recent.length === 0) {
    return (
      <div className="text-center py-10 text-gray-600 text-sm">
        No chats yet — go to Chat to start one
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {recent.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onOpenChat(chat.id)}
          className="text-left bg-[#141414] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 hover:bg-[#181818] transition-colors group"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="font-medium text-gray-200 text-sm truncate">{chat.name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {chat.lastMessage && (
                <span className={`w-2 h-2 rounded-full ${chat.lastMessage.role === 'assistant' ? 'bg-[#00ff88]' : 'bg-gray-600'}`} />
              )}
              <span className="text-xs text-gray-600">{timeAgo(chat.updatedAt)}</span>
            </div>
          </div>
          {chat.lastMessage ? (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {chat.lastMessage.content.length > 100
                ? chat.lastMessage.content.slice(0, 100) + '…'
                : chat.lastMessage.content}
            </p>
          ) : (
            <p className="text-xs text-gray-700 italic">No messages yet</p>
          )}
          {chat._count?.messages != null && (
            <p className="text-[10px] text-gray-700 mt-1.5">{chat._count.messages} message{chat._count.messages !== 1 ? 's' : ''}</p>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Current model badge ───────────────────────────────────────────────────────

function ModelBadge() {
  const [models, setModels] = useState<Array<{ id: string; label: string; provider?: string; default?: boolean }> | null>(null)

  useEffect(() => {
    fetch('/api/chat')
      .then(r => r.ok ? r.json() : null)
      .then(d => setModels(d?.models ?? null))
      .catch(() => {})
  }, [])

  if (!models) return null

  const primary = models.find(m => m.default) ?? models[0]
  if (!primary) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
      {primary.provider ?? ''} {modelLabel(primary.id)}
    </span>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ allChats, onOpenChat, onNavChange }: Props) {

  return (
    <div className="min-h-full bg-[#0f0f0f]">
      <div className="max-w-4xl w-full mx-auto p-4 md:p-6 space-y-5">

        {/* Greeting */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-100 leading-tight">
              Good {getGreeting()}, Vincent
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <ModelBadge />
        </div>

        {/* Quick stats row */}
        <QuickStatsRow allChats={allChats} onNavChange={onNavChange} />

        {/* AI Status + Usage row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AIStatusWidget />
          <UsageWidget />
        </div>

        {/* Best price + Servers row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BestPriceWidget onNavChange={onNavChange} />
          <ServerOverviewWidget onNavChange={onNavChange} />
        </div>

        {/* Recent chats */}
        <div>
          <h2 className="text-[11px] text-gray-600 uppercase tracking-widest mb-3">Recent Chats</h2>
          <RecentChats allChats={allChats} onOpenChat={onOpenChat} />
        </div>

      </div>
    </div>
  )
}
