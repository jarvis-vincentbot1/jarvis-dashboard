'use client'

import { useState, useMemo } from 'react'

interface Supplier {
  name: string
  url: string
  country: string
  flag: string
  note: string
  status: 'live' | 'pending'
}

const SUPPLIERS: Supplier[] = [
  { name: 'Alternate.nl',   url: 'https://www.alternate.nl',     country: 'NL', flag: '🇳🇱', note: 'Large Dutch tech retailer, same-day delivery',           status: 'live' },
  { name: 'Coolblue',       url: 'https://www.coolblue.nl',      country: 'NL', flag: '🇳🇱', note: 'Best-in-class NL service & returns policy',              status: 'live' },
  { name: 'Bol.com',        url: 'https://www.bol.com',          country: 'NL', flag: '🇳🇱', note: 'Dutch marketplace, seller ratings matter',               status: 'live' },
  { name: 'MediaMarkt',     url: 'https://www.mediamarkt.nl',    country: 'NL', flag: '🇳🇱', note: 'Brick-and-mortar pickup available',                      status: 'live' },
  { name: 'Mindfactory',    url: 'https://www.mindfactory.de',   country: 'DE', flag: '🇩🇪', note: 'Top German PC components specialist',                    status: 'live' },
  { name: 'Amazon.de',      url: 'https://www.amazon.de',        country: 'DE', flag: '🇩🇪', note: 'Verify "Ships from Amazon" for authenticity',            status: 'live' },
  { name: 'LDLC',           url: 'https://www.ldlc.com',         country: 'FR', flag: '🇫🇷', note: 'Leading French PC hardware retailer',                    status: 'pending' },
  { name: 'Newegg',         url: 'https://www.newegg.com',       country: 'US', flag: '🇺🇸', note: 'Global PC components, ships to EU',                      status: 'pending' },
]

const ALL_REGIONS = ['All', 'NL', 'DE', 'FR', 'US']

export default function TrustedSuppliers() {
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('All')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SUPPLIERS.filter(s => {
      const matchesRegion = region === 'All' || s.country === region
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.note.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)
      return matchesRegion && matchesSearch
    })
  }, [search, region])

  return (
    <div className="px-4 pb-6 md:px-6">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Trusted Suppliers</h2>
            <p className="text-xs text-gray-500 mt-0.5">Curated retailers verified for RTX 5090 availability</p>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-md bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 flex-shrink-0">
            {filtered.length} / {SUPPLIERS.length}
          </span>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-gray-200 placeholder-gray-600 bg-[#141414] border border-white/[0.06] focus:border-white/15 focus:outline-none transition-colors"
            />
          </div>

          {/* Region filter */}
          <div className="flex items-center gap-1 bg-[#141414] border border-white/[0.06] rounded-lg px-1.5 py-1">
            {ALL_REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  region === r
                    ? 'bg-[#00ff88]/15 text-[#00ff88]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">
            No suppliers match your filter
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-3 hover:border-white/10 hover:bg-[#181818] transition-colors"
              >
                {/* Flag */}
                <span className="text-xl flex-shrink-0 mt-0.5">{s.flag}</span>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                      {s.name}
                    </span>
                    {/* Status badge */}
                    {s.status === 'live' ? (
                      <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/20 rounded px-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                        Live
                      </span>
                    ) : (
                      <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        Pending
                      </span>
                    )}
                    {/* Verification badge */}
                    <span
                      title="Verified retailer"
                      className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-gray-500 bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M6 1L7.5 4.2L11 4.7L8.5 7.1L9.1 10.6L6 9L2.9 10.6L3.5 7.1L1 4.7L4.5 4.2L6 1Z"
                          fill="currentColor"
                        />
                      </svg>
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.note}</p>
                </div>

                {/* Arrow */}
                <span className="text-gray-600 group-hover:text-gray-400 text-xs flex-shrink-0 mt-1 transition-colors">↗</span>
              </a>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-[11px] text-gray-600 text-center pt-1">
          Always buy from official storefronts. Avoid third-party marketplace sellers with no ratings.
        </p>
      </div>
    </div>
  )
}
