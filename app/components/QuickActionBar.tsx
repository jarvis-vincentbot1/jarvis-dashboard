'use client'

type QuickAction = 'search' | 'usage' | 'job' | 'alerts'

interface Props {
  onActionClick?: (action: QuickAction) => void
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

const ACTIONS: { id: QuickAction; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'search', label: 'Search Suppliers', icon: <SearchIcon />, color: '#3b82f6' },
  { id: 'usage',  label: 'View API Usage',   icon: <BarChartIcon />, color: '#a855f7' },
  { id: 'job',    label: 'Run Job',           icon: <ZapIcon />,     color: '#f97316' },
  { id: 'alerts', label: 'View Alerts',       icon: <BellIcon />,    color: '#00ff88' },
]

export default function QuickActionBar({ onActionClick }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {ACTIONS.map(({ id, label, icon, color }) => (
        <button
          key={id}
          aria-label={label}
          onClick={() => onActionClick?.(id)}
          className="flex items-center gap-3 bg-[#141414] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 hover:bg-[#181818] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <span className="flex-shrink-0" style={{ color }}>
            {icon}
          </span>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </button>
      ))}
    </div>
  )
}
