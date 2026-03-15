'use client'

export function CardSkeleton({ className = '', rows = 3 }: { className?: string; rows?: number }) {
  return (
    <div className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 animate-pulse ${className}`}>
      <div className="h-2.5 bg-[#2a2a2a] rounded w-1/3 mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 bg-[#2a2a2a] rounded" style={{ width: `${40 + (i % 3) * 15}%` }} />
            <div className="h-3 bg-[#2a2a2a] rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton({ className = '' }: { className?: string }) {
  const heights = [35, 55, 45, 70, 60, 40, 80, 50, 65, 45, 75, 55, 40, 60]
  return (
    <div className={`bg-[#141414] border border-white/5 rounded-xl p-4 animate-pulse ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 bg-[#2a2a2a] rounded w-24" />
        <div className="flex gap-3">
          {[70, 80, 60].map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#2a2a2a]" />
              <div className="h-2.5 bg-[#2a2a2a] rounded" style={{ width: w }} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-1 h-32">
        {heights.map((h, i) => (
          <div key={i} className="flex-1 bg-[#2a2a2a] rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex gap-1 mt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 h-2 bg-[#2a2a2a] rounded" />
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 4, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2a2a2a] rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#2a2a2a] rounded w-1/3" />
              <div className="h-3 bg-[#2a2a2a] rounded w-2/3" />
            </div>
            <div className="w-14 h-5 bg-[#2a2a2a] rounded-full flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
