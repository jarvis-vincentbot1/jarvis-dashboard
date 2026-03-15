'use client'

import { useEffect } from 'react'

interface NavItem {
  id: string
  label: string
  icon: string
  onClick: () => void
}

export function MobileDrawer({ isOpen, onClose, items }: {
  isOpen: boolean
  onClose: () => void
  items: NavItem[]
}) {
  useEffect(() => {
    if (!isOpen) return

    // Prevent body scroll when drawer is open
    document.body.style.overflow = 'hidden'

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleBackdropClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.id === 'drawer-backdrop') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    document.addEventListener('click', handleBackdropClick)

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.removeEventListener('click', handleBackdropClick)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        id="drawer-backdrop"
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-64 bg-[#141414] border-l border-[#2a2a2a] z-50 md:hidden shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 bg-[#141414] border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-100">Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a1a]"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Menu Items */}
        <div className="overflow-y-auto p-3 space-y-1 max-h-[calc(100vh-60px)]">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.onClick()
                onClose()
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-sm text-gray-300 hover:text-gray-100 flex items-center gap-3 group"
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="sticky bottom-0 bg-[#141414] border-t border-[#2a2a2a] px-4 py-2 text-xs text-gray-600">
          Tap outside to close
        </div>
      </div>
    </>
  )
}
