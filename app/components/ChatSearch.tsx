'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface Chat {
  id: string
  name: string
  projectId: string | null
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
  lastMessage?: { role: string; content: string; createdAt: string } | null
}

interface ProjectGroup {
  id: string
  name: string
  color: string
  chats: Chat[]
}

interface Props {
  chatData: {
    standalone: Chat[]
    projects: ProjectGroup[]
  }
  onFilteredChats: (chats: Chat[], projectFilter?: string) => void
}

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc'

export function ChatSearch({ chatData, onFilteredChats }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [filteredChats, setFilteredChats] = useState<Chat[]>([])
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved search term from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('jarvis-search-term')
    if (saved) {
      setSearchTerm(saved)
    }
  }, [])

  // Debounced search
  const performSearch = useCallback(() => {
    let results: Chat[] = []

    // Get chats to search
    if (projectFilter === 'all') {
      results = [
        ...chatData.standalone,
        ...chatData.projects.flatMap((p) => p.chats),
      ]
    } else if (projectFilter === 'standalone') {
      results = chatData.standalone
    } else {
      const project = chatData.projects.find((p) => p.id === projectFilter)
      results = project?.chats ?? []
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      results = results.filter((chat) => chat.name.toLowerCase().includes(term))
    }

    // Sort
    results.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })

    setFilteredChats(results)
    onFilteredChats(results, projectFilter === 'all' ? undefined : projectFilter)
  }, [searchTerm, sortBy, projectFilter, chatData, onFilteredChats])

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch()
      sessionStorage.setItem('jarvis-search-term', searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchTerm, performSearch])

  // Initial search on mount or filter/sort change
  useEffect(() => {
    performSearch()
  }, [projectFilter, sortBy])

  const handleClearSearch = () => {
    setSearchTerm('')
    sessionStorage.removeItem('jarvis-search-term')
  }

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      searchTerm,
      sortBy,
      projectFilter,
      chatsCount: filteredChats.length,
      chats: filteredChats.map((c) => ({
        id: c.id,
        name: c.name,
        projectId: c.projectId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count?.messages ?? 0,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jarvis-chats-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const allChats = [
    ...chatData.standalone,
    ...chatData.projects.flatMap((p) => p.chats),
  ]

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/20"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
            title="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {filteredChats.length} of {allChats.length} chats
        </span>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {showFilters ? 'Hide' : 'Filters'}
        </button>
      </div>

      {/* Filter controls */}
      {showFilters && (
        <div className="space-y-2 p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
          {/* Project filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-[#242424] border border-[#333] rounded text-gray-200 focus:outline-none focus:border-[#00ff88]"
            >
              <option value="all">All Chats</option>
              <option value="standalone">Standalone Chats</option>
              {chatData.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort option */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-2 py-1.5 text-xs bg-[#242424] border border-[#333] rounded text-gray-200 focus:outline-none focus:border-[#00ff88]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
            </select>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            className="w-full px-2 py-1.5 text-xs bg-[#00ff88]/10 hover:bg-[#00ff88]/20 text-[#00ff88] rounded border border-[#00ff88]/20 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export as JSON
          </button>
        </div>
      )}
    </div>
  )
}
