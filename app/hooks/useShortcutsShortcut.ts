import { useEffect } from 'react'

export function useShortcutsShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+/ (Mac) or Ctrl+/ (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        onOpen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpen])
}
