'use client'

interface Supplier {
  name: string
  url: string
  country: string
  flag: string
  note: string
}

const SUPPLIERS: Supplier[] = [
  { name: 'Alternate.nl',   url: 'https://www.alternate.nl',     country: 'NL', flag: '🇳🇱', note: 'Large Dutch tech retailer, same-day delivery' },
  { name: 'Coolblue',       url: 'https://www.coolblue.nl',      country: 'NL', flag: '🇳🇱', note: 'Best-in-class NL service & returns policy' },
  { name: 'Bol.com',        url: 'https://www.bol.com',          country: 'NL', flag: '🇳🇱', note: 'Dutch marketplace, seller ratings matter' },
  { name: 'MediaMarkt',     url: 'https://www.mediamarkt.nl',    country: 'NL', flag: '🇳🇱', note: 'Brick-and-mortar pickup available' },
  { name: 'Mindfactory',    url: 'https://www.mindfactory.de',   country: 'DE', flag: '🇩🇪', note: 'Top German PC components specialist' },
  { name: 'Amazon.de',      url: 'https://www.amazon.de',        country: 'DE', flag: '🇩🇪', note: 'Verify "Ships from Amazon" for authenticity' },
  { name: 'LDLC',           url: 'https://www.ldlc.com',         country: 'FR', flag: '🇫🇷', note: 'Leading French PC hardware retailer' },
  { name: 'Newegg',         url: 'https://www.newegg.com',       country: 'US', flag: '🇺🇸', note: 'Global PC components, ships to EU' },
]

export default function TrustedSuppliers() {
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
            {SUPPLIERS.length} verified
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUPPLIERS.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 hover:border-[#3a3a3a] hover:bg-[#1f1f1f] transition-colors"
            >
              {/* Flag */}
              <span className="text-xl flex-shrink-0 mt-0.5">{s.flag}</span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                    {s.name}
                  </span>
                  {/* Verification badge */}
                  <span
                    title="Verified retailer"
                    className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/20 rounded px-1.5 py-0.5"
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

        {/* Footer note */}
        <p className="text-[11px] text-gray-600 text-center pt-1">
          Always buy from official storefronts. Avoid third-party marketplace sellers with no ratings.
        </p>
      </div>
    </div>
  )
}
