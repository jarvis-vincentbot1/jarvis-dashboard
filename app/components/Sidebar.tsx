'use client'

import { useState } from 'react'
import { ThemeToggle } from './ThemeToggle'

export type NavItem = 'dashboard' | 'chat' | 'calculator' | 'monitoring' | 'supervisor' | 'todo' | 'prices' | 'usage' | 'gpu-inventory'

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

function SupervisorIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
      <line x1="19" y1="3" x2="19" y2="21" />
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

function InventoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function UsageIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
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

const NAV_GROUPS: {
  label?: string
  items: { id: NavItem; label: string; Icon: React.FC<{ active: boolean }> }[]
}[] = [
  {
    items: [
      { id: 'dashboard', label: 'Home',       Icon: GridIcon },
      { id: 'chat',      label: 'Chat',       Icon: ChatIcon },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { id: 'prices',        label: 'Hardware',   Icon: GpuIcon },
      { id: 'gpu-inventory', label: 'GPU Stock',  Icon: InventoryIcon },
      { id: 'monitoring',    label: 'Servers',    Icon: MonitorIcon },
      { id: 'usage',         label: 'API Usage',  Icon: UsageIcon },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'supervisor',label: 'Supervisor', Icon: SupervisorIcon },
      { id: 'todo',      label: 'Tasks',      Icon: TodoIcon },
      { id: 'calculator',label: 'Calculator', Icon: CalcIcon },
    ],
  },
]

// Flat list for mobile drawer (order matters)
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({ activeNav, onNavChange, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(id: NavItem) {
    onNavChange(id)
    setMenuOpen(false)
  }

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
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="px-3 mb-1">
                  <span className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold">{group.label}</span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => onNavChange(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      activeNav === id
                        ? 'text-[#00ff88] bg-[#00ff88]/10'
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
              </div>
            </div>
          ))}
        </nav>

        {/* Footer controls */}
        <div className="px-2 py-3 border-t border-white/5 flex-shrink-0 space-y-1">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Theme</span>
            <ThemeToggle />
          </div>
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-12 bg-[#141414] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_4px_#00ff88]" />
          <span className="text-white font-bold text-base tracking-[0.15em]">JARVIS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{NAV_ITEMS.find(n => n.id === activeNav)?.label}</span>
          {/* Hamburger button */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:text-white"
            aria-label="Open menu"
          >
            <span className={`block w-5 h-0.5 bg-current rounded-full transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-current rounded-full transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-current rounded-full transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ── */}
      <div
        className={`md:hidden fixed top-0 right-0 bottom-0 z-50 w-64 bg-[#141414] border-l border-white/5 flex flex-col transition-transform duration-250 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/5 flex-shrink-0">
          <span className="text-white font-bold text-base tracking-[0.15em]">Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 active:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                activeNav === id
                  ? 'text-[#00ff88] bg-[#00ff88]/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon active={activeNav === id} />
              <span>{label}</span>
              {activeNav === id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
              )}
            </button>
          ))}
        </nav>

        {/* Drawer sign out */}
        <div className="px-3 py-4 border-t border-white/5 flex-shrink-0" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={() => { setMenuOpen(false); onLogout() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
