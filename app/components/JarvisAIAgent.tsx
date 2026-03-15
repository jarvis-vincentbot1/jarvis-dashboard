'use client'

import { useState, useEffect } from 'react'

interface JarvisStatus {
  online: boolean
  latencyMs: number
}

interface ModelHealth {
  ok: boolean
  latencyMs: number
}

export default function JarvisAIAgent() {
  const [status, setStatus] = useState<JarvisStatus | null>(null)
  const [haiku, setHaiku] = useState<ModelHealth | null>(null)
  const [sonnet, setSonnet] = useState<ModelHealth | null>(null)
  const [opus, setOpus] = useState<ModelHealth | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/status')
        if (res.ok) {
          const data = await res.json()
          setStatus({ online: data.openclaw.online, latencyMs: data.openclaw.latencyMs })
          setHaiku(data.haiku)
          setSonnet(data.sonnet)
          setOpus(data.opus)
        }
      } catch (error) {
        console.error('Failed to fetch Jarvis status:', error)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-gradient-to-br from-[#0a2a1a] to-[#0f1a0f] border border-[#00ff88]/30 rounded-xl p-6 hover:border-[#00ff88]/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#00ff88]/10 flex items-center justify-center border border-[#00ff88]/20">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Jarvis</h2>
            <p className="text-[#00ff88] text-xs font-medium">Active AI Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${status?.online ? 'bg-[#00ff88] shadow-[0_0_6px_#00ff88]' : 'bg-gray-600'}`} />
          <span className={`text-xs font-medium ${status?.online ? 'text-[#00ff88]' : 'text-gray-400'}`}>
            {status?.online ? 'Active' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Status Info */}
      <div className="space-y-3">
        {/* Primary Model */}
        <div className="bg-[#1a1a1a]/50 border border-[#00ff88]/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
              <span className="text-sm font-medium text-gray-300">Primary Model</span>
            </div>
            <span className="text-xs text-[#00ff88] font-mono">Claude Haiku</span>
          </div>
          {haiku && (
            <div className="text-xs text-gray-500 mt-1">
              {haiku.ok ? `${haiku.latencyMs}ms latency` : 'Unavailable'}
            </div>
          )}
        </div>

        {/* Available Models */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Available Models</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Sonnet */}
            <div className="bg-[#1a1a1a]/30 border border-gray-700/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sonnet?.ok ? 'bg-blue-400' : 'bg-gray-600'}`} />
                <span className="text-xs font-medium text-gray-300">Sonnet</span>
              </div>
              <span className="text-[10px] text-gray-600">Balanced</span>
            </div>

            {/* Opus */}
            <div className="bg-[#1a1a1a]/30 border border-gray-700/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opus?.ok ? 'bg-purple-400' : 'bg-gray-600'}`} />
                <span className="text-xs font-medium text-gray-300">Opus</span>
              </div>
              <span className="text-[10px] text-gray-600">Powerful</span>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="pt-2 border-t border-[#00ff88]/20">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#00ff88]/5 border border-[#00ff88]/20 text-[10px] text-[#00ff88]">
              🎤 Voice Input
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#00ff88]/5 border border-[#00ff88]/20 text-[10px] text-[#00ff88]">
              ✨ AI Generation
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#00ff88]/5 border border-[#00ff88]/20 text-[10px] text-[#00ff88]">
              📋 Supervision
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
