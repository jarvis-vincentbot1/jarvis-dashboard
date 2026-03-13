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

interface Agent {
  id?: string
  name?: string
  status?: string
  startedAt?: string
}

interface Props {
  allChats: Chat[]
  onOpenChat: (id: string) => void
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
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

function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

export default function Dashboard({ allChats, onOpenChat }: Props) {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [usage, setUsage] = useState<{ input_tokens?: number; output_tokens?: number; error?: string } | null>(null)

  // Fetch agents and usage in parallel
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.ok ? r.json() : null)
      .then(data => setAgents(data?.agents ?? data ?? []))
      .catch(() => setAgents([]))

    fetch('/api/usage')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUsage(data ?? { error: 'unavailable' }))
      .catch(() => setUsage({ error: 'unavailable' }))
  }, [])

  const recentChats = [...allChats]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  return (
    <div className="min-h-full bg-[#0f0f0f]">
      <div className="max-w-4xl w-full mx-auto p-4 md:p-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            Good {getGreeting()}, Vincent
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {allChats.length} chat{allChats.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Widgets row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Active Agents widget */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
              <h2 className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Active Agents
              </h2>
            </div>
            {agents === null ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-3 h-3 border border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-600">Loading...</span>
              </div>
            ) : agents.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No agents running</p>
            ) : (
              <ul className="space-y-2">
                {agents.slice(0, 5).map((agent, i) => (
                  <li key={agent.id ?? i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 truncate">
                      {agent.name ?? agent.id ?? `Agent ${i + 1}`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      agent.status === 'running'
                        ? 'bg-[#00ff88]/10 text-[#00ff88]'
                        : 'bg-gray-800 text-gray-500'
                    }`}>
                      {agent.status ?? 'unknown'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Claude Usage widget */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <h2 className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Claude Usage Today
              </h2>
            </div>
            {usage === null ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-600">Loading...</span>
              </div>
            ) : usage.error ? (
              <p className="text-sm text-gray-600 italic">Usage data unavailable</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Input tokens</span>
                  <span className="text-sm font-mono text-gray-200">
                    {usage.input_tokens != null ? formatNum(usage.input_tokens) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Output tokens</span>
                  <span className="text-sm font-mono text-gray-200">
                    {usage.output_tokens != null ? formatNum(usage.output_tokens) : '—'}
                  </span>
                </div>
                {usage.input_tokens != null && usage.output_tokens != null && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#2a2a2a]">
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-sm font-mono text-purple-400">
                      {formatNum(usage.input_tokens + usage.output_tokens)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Chats widget */}
        <div>
          <h2 className="text-xs text-gray-600 uppercase tracking-widest mb-3">
            Recent Chats
          </h2>

          {recentChats.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">
              No chats yet. Go to Chat to start one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onOpenChat(chat.id)}
                  className="text-left bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] hover:bg-[#1f1f1f] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-medium text-gray-200 text-sm truncate">
                      {chat.name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {chat.lastMessage && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            chat.lastMessage.role === 'assistant' ? 'bg-[#00ff88]' : 'bg-gray-600'
                          }`}
                        />
                      )}
                      <span className="text-xs text-gray-600">
                        {timeAgo(chat.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {chat.lastMessage ? (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {chat.lastMessage.content.length > 80
                        ? chat.lastMessage.content.slice(0, 80) + '…'
                        : chat.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-700 italic">No messages yet</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
