'use client'

export type NavItem = 'dashboard' | 'chat' | 'calculator' | 'todo'

interface Props {
  activeNav: NavItem
  onNavChange: (nav: NavItem) => void
  onLogout: () => void
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CalcIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <circle cx="8" cy="11" r="0.5" fill="currentColor" />
      <circle cx="12" cy="11" r="0.5" fill="currentColor" />
      <circle cx="16" cy="11" r="0.5" fill="currentColor" />
      <circle cx="8" cy="15" r="0.5" fill="currentColor" />
      <circle cx="12" cy="15" r="0.5" fill="currentColor" />
      <circle cx="16" cy="15" r="0.5" fill="currentColor" />
      <circle cx="8" cy="19" r="0.5" fill="currentColor" />
      <circle cx="12" cy="19" r="0.5" fill="currentColor" />
      <circle cx="16" cy="19" r="0.5" fill="currentColor" />
    </svg>
  )
}

function TodoIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const NAV_ITEMS: { id: NavItem; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: GridIcon },
  { id: 'chat', label: 'Chat', Icon: ChatIcon },
  { id: 'calculator', label: 'Calculator', Icon: CalcIcon },
  { id: 'todo', label: 'To-Do', Icon: TodoIcon },
]

export default function Sidebar({ activeNav, onNavChange, onLogout }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] bg-[#1a1a1a] border-r border-[#2a2a2a] h-full flex-shrink-0">
        <div className="px-5 h-14 flex items-center border-b border-[#2a2a2a] flex-shrink-0">
          <span className="text-[#00ff88] font-bold text-xl tracking-wider">JARVIS</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeNav === id
                  ? 'text-[#00ff88] bg-[#00ff88]/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1f1f1f]'
              }`}
            >
              <Icon active={activeNav === id} />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-[#2a2a2a] flex-shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-400 hover:bg-[#1f1f1f] transition-colors"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-[#2a2a2a] bg-[#1a1a1a] z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onNavChange(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              activeNav === id ? 'text-[#00ff88]' : 'text-gray-600'
            }`}
          >
            <Icon active={activeNav === id} />
            {label}
          </button>
        ))}
      </div>
    </>
  )
}
