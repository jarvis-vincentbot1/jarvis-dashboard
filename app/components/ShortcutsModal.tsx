'use client'

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    keys: string
    description: string
  }>
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘K / Ctrl+K', description: 'Open global search' },
      { keys: '⌘/', description: 'Show keyboard shortcuts' },
      { keys: 'Esc', description: 'Close modals' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: 'Enter', description: 'Select highlighted item' },
      { keys: '↑/↓', description: 'Navigate search results' },
      { keys: '⌘S', description: 'Save current view' },
    ],
  },
  {
    title: 'Quick Access',
    shortcuts: [
      { keys: '⌘1', description: 'Go to Dashboard' },
      { keys: '⌘2', description: 'Go to Search' },
      { keys: '⌘3', description: 'Go to Settings' },
    ],
  },
]

import { useEffect } from 'react'

export function ShortcutsModal({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#141414] border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-2xl leading-none"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors group">
                    <span className="text-sm text-gray-300">{shortcut.description}</span>
                    <div className="flex gap-2">
                      {shortcut.keys.split('/').map((key, i) => (
                        <div key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-gray-600 text-xs">or</span>}
                          <code className="px-2.5 py-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-xs text-[#00ff88] font-mono font-semibold">
                            {key.trim()}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#141414] border-t border-[#2a2a2a] px-6 py-3 text-xs text-gray-600">
          Press <code className="px-2 py-0.5 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-[10px] text-[#00ff88] font-mono">Esc</code> to close
        </div>
      </div>
    </div>
  )
}
