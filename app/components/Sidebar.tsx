'use client'

export type NavItem = 'dashboard' | 'chat' | 'calculator' | 'monitoring' | 'todo' | 'prices'

interface Props {
  activeNav: NavItem
  onNavChange: (nav: NavItem) => void
  onLogout: () => void
}

// ── Icons ────────────────────────────────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function MonitorIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function GpuIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <path d="M6 7V4" /><path d="M10 7V4" /><path d="M14 7V4" /><path d="M18 7V4" />
      <path d="M6 21v-4" /><path d="M10 21v-4" /><path d="M14 21v-4" /><path d="M18 21v-4" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TodoIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function CalcIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="12" x2="8.01" y2="12" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="12" y1="12" x2="12.01" y2="12" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="16" y1="12" x2="16.01" y2="12" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="8" y1="16" x2="8.01" y2="16" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="16" y1="16" x2="16.01" y2="16" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: NavItem; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  { id: 'dashboard', label: 'Home',       Icon: GridIcon },
  { id: 'chat',      label: 'Chat',       Icon: ChatIcon },
  { id: 'prices',    label: 'RTX 5090',   Icon: GpuIcon },
  { id: 'monitoring',label: 'Servers',    Icon: MonitorIcon },
  { id: 'todo',      label: 'Tasks',      Icon: TodoIcon },
  { id: 'calculator',label: 'Calculator', Icon: CalcIcon },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({ activeNav, onNavChange, onLogout }: Props) {
  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-[200px] bg-[#141414] border-r border-white/5 h-full flex-shrink-0">
        {/* Logo */}
        <div className="px-5 h-14 flex items-center border-b border-white/5 flex-shrink-0 gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_6px_#00ff88]" />
          <span className="text-white font-bold text-lg tracking-[0.2em]">JARVIS</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeNav === id
                  ? 'text-[#00ff88] bg-[#00ff88]/10 shadow-inner'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <span className="flex-shrink-0">
                <Icon active={activeNav === id} />
              </span>
              <span className="truncate">{label}</span>
              {activeNav === id && (
                <span className="ml-auto w-1 h-4 rounded-full bg-[#00ff88] flex-shrink-0" />
              )}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-2 py-3 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-12 bg-[#141414] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_4px_#00ff88]" />
          <span className="text-white font-bold text-base tracking-[0.15em]">JARVIS</span>
        </div>
        <span className="text-xs text-gray-500 capitalize">{NAV_ITEMS.find(n => n.id === activeNav)?.label}</span>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#141414] border-t border-white/5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch">
          {NAV_ITEMS.slice(0, 5).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 min-h-[52px] transition-all active:scale-95 ${
                activeNav === id ? 'text-[#00ff88]' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {activeNav === id && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00ff88] rounded-full" />
              )}
              <Icon active={activeNav === id} />
              <span className="text-[9px] font-semibold tracking-wide leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
