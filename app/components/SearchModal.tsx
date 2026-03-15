'use client'

import { useState, useEffect } from 'react'

interface SearchResult {
  type: 'chat' | 'gpu' | 'task' | 'run'
  id: string
  title: string
  subtitle?: string
  icon: string
}

export function SearchModal({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    // Simulate search delay
    const timer = setTimeout(() => {
      // Mock search results - in production, would fetch from API
      const allResults: SearchResult[] = [
        {
          type: 'chat' as const,
          id: '1',
          title: 'RTX 5090 Pricing Analysis',
          subtitle: '12 messages',
          icon: '💬',
        },
        {
          type: 'gpu' as const,
          id: '2',
          title: 'NVIDIA RTX 5090',
          subtitle: 'Price: €4,999',
          icon: '🖥️',
        },
        {
          type: 'task' as const,
          id: '3',
          title: 'Monitor GPU stock',
          subtitle: 'Due today',
          icon: '✓',
        },
      ]
      const mockResults = allResults.filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
      
      setResults(mockResults)
      setLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        setSelectedIndex(Math.max(selectedIndex - 1, 0))
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        // Would navigate to result
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, results, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl w-full max-w-lg shadow-2xl">
        {/* Search input */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <input
            type="text"
            placeholder="Search chats, GPUs, tasks, runs... (ESC to close)"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#00ff88]/50 placeholder-gray-600"
          />
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {query ? 'No results found' : 'Start typing to search...'}
            </div>
          ) : (
            results.map((result, idx) => (
              <button
                key={result.id}
                onClick={() => onClose()}
                className={`w-full text-left px-4 py-3 border-b border-[#2a2a2a] last:border-b-0 transition-colors ${
                  idx === selectedIndex
                    ? 'bg-[#1a1a1a]'
                    : 'hover:bg-[#1a1a1a]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-xs text-gray-500">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#2a2a2a] text-xs text-gray-600 flex gap-2">
          <span>↑↓ Navigate</span>
          <span>•</span>
          <span>Enter Select</span>
          <span>•</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  )
}
