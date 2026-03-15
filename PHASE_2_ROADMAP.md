# Jarvis Dashboard - Phase 2 Implementation Roadmap

**Date:** 2026-03-15 12:00 GMT+1  
**Status:** Planning & Ready  
**Timeline:** 1-2 weeks for all features

---

## 🎯 Phase 2 Objectives

1. **Enhance Dashboard** — Add quick stats + quick actions
2. **Global Search** — Cmd+K / Ctrl+K search across all data
3. **Mobile UX** — Better gestures and touch targets
4. **Keyboard Shortcuts** — Shortcut reference modal

**Expected Effort:** 4-6 hours total  
**Expected Impact:** High (major UX improvements)

---

## QUICK WIN #1: Enhanced Dashboard with Quick Actions

**Effort:** 1 hour  
**Status:** Ready to implement  
**Impact:** Medium-High  

### What to Add

The Dashboard already has QuickStatsRow. We'll enhance it with:

#### Quick Actions Bar
Add a row of action buttons below the greeting:

```
┌─ Quick Actions ────────────────────────────────────────┐
│ [+ New Chat]  [+ Add GPU]  [+ New Task]  [🔍 Search]  │
└────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// app/components/Dashboard.tsx - Add after QuickStatsRow

function QuickActionsBar({ onNavChange }: { onNavChange?: (nav: string) => void }) {
  const [showNewChat, setShowNewChat] = useState(false)
  
  return (
    <div className="flex gap-2 flex-wrap">
      <button 
        onClick={() => setShowNewChat(true)}
        className="px-4 py-2 text-sm rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors"
      >
        ✚ New Chat
      </button>
      <button 
        onClick={() => onNavChange?.('product-research')}
        className="px-4 py-2 text-sm rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
      >
        + Add GPU
      </button>
      <button 
        onClick={() => onNavChange?.('todo')}
        className="px-4 py-2 text-sm rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
      >
        + New Task
      </button>
      <button 
        // Will be connected to global search in Phase 2.2
        className="px-4 py-2 text-sm rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
      >
        🔍 Search
      </button>
    </div>
  )
}
```

#### Integration Point
Add to `Dashboard.tsx` render, after QuickStatsRow:

```typescript
<QuickActionsBar onNavChange={onNavChange} />
```

### Testing Checklist
- [ ] All buttons render
- [ ] Buttons are clickable
- [ ] Navigation works on click
- [ ] Responsive on mobile (stack if needed)
- [ ] Colors match theme

---

## QUICK WIN #2: Global Search (Cmd+K / Ctrl+K)

**Effort:** 1.5 hours  
**Status:** Ready to implement  
**Impact:** High  

### Implementation Plan

#### Step 1: Create SearchModal Component

**File:** `app/components/SearchModal.tsx` (NEW)

```typescript
'use client'

import { useState, useEffect } from 'react'

interface SearchResult {
  type: 'chat' | 'gpu' | 'task' | 'run'
  id: string
  title: string
  subtitle?: string
  icon: string
}

export function SearchModal({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    // Search across all data
    Promise.all([
      fetch('/api/chats').then(r => r.json()).catch(() => ({})),
      fetch('/api/gpu').then(r => r.json()).catch(() => ({})),
      fetch('/api/todos').then(r => r.json()).catch(() => ({})),
      fetch('/api/runs').then(r => r.json()).catch(() => ({})),
    ]).then(([chats, gpus, todos, runs]) => {
      const filtered: SearchResult[] = []
      
      // Filter chats
      if (chats?.data) {
        chats.data.forEach((c: any) => {
          if (c.name.toLowerCase().includes(query.toLowerCase())) {
            filtered.push({
              type: 'chat',
              id: c.id,
              title: c.name,
              subtitle: `${c._count?.messages ?? 0} messages`,
              icon: '💬',
            })
          }
        })
      }
      
      // Similar for GPUs, todos, runs...
      setResults(filtered)
    })
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl w-full max-w-lg">
        {/* Search input */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <input
            type="text"
            placeholder="Search chats, GPUs, tasks, runs..."
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1))
              if (e.key === 'ArrowUp') setSelectedIndex(Math.max(selectedIndex - 1, 0))
              if (e.key === 'Enter' && results[selectedIndex]) {
                // Navigate to result
                onClose()
              }
            }}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#00ff88]/50"
          />
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {query ? 'No results found' : 'Start typing to search...'}
            </div>
          ) : (
            results.map((result, idx) => (
              <button
                key={result.id}
                onClick={() => {
                  // Navigate to result
                  onClose()
                }}
                className={`w-full text-left px-4 py-3 border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors ${
                  selectedIndex === idx ? 'bg-[#1a1a1a] border-l-2 border-l-[#00ff88]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-gray-500">{result.subtitle}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

#### Step 2: Add Keyboard Shortcut Handler

**File:** `app/page.tsx` - Add to main component:

```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    // Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
    // Cmd+N or Ctrl+N for new chat
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      // Trigger new chat
    }
    // ? for help
    if (e.key === '?' && !e.shiftKey) {
      e.preventDefault()
      // Show help modal
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

#### Step 3: Integrate into Page Layout

```typescript
<SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
```

### Testing Checklist
- [ ] Cmd+K opens search (Mac)
- [ ] Ctrl+K opens search (Windows/Linux)
- [ ] Search input receives focus automatically
- [ ] Results filter in real-time
- [ ] Keyboard navigation (↑↓ Enter Escape) works
- [ ] Escape closes modal
- [ ] Clicking result navigates + closes modal
- [ ] Mobile responsive (modal visible)

---

## QUICK WIN #3: Keyboard Shortcuts Reference

**Effort:** 30 minutes  
**Status:** Ready to implement  
**Impact:** Medium  

### Implementation

**File:** `app/components/KeyboardShortcuts.tsx` (NEW)

```typescript
'use client'

interface Shortcut {
  keys: string
  action: string
  description?: string
}

const SHORTCUTS: Shortcut[] = [
  {
    keys: 'Cmd+K / Ctrl+K',
    action: 'Global search',
    description: 'Search across all chats, GPUs, tasks, and runs',
  },
  {
    keys: 'Cmd+N / Ctrl+N',
    action: 'New chat',
    description: 'Start a new chat conversation',
  },
  {
    keys: 'Cmd+, / Ctrl+,',
    action: 'Settings',
    description: 'Open settings and preferences',
  },
  {
    keys: '?',
    action: 'Help',
    description: 'Show this keyboard shortcuts reference',
  },
  {
    keys: 'Escape',
    action: 'Close',
    description: 'Close modals and search',
  },
  {
    keys: 'Enter',
    action: 'Send',
    description: 'Send message (in chat input)',
  },
  {
    keys: 'Shift+Enter',
    action: 'New line',
    description: 'Create new line (in chat input)',
  },
]

export function KeyboardShortcuts({ isOpen, onClose }: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl w-full max-w-md max-h-96 overflow-y-auto">
        <div className="sticky top-0 px-6 py-4 border-b border-[#2a2a2a] bg-[#141414]">
          <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
        </div>

        <div className="p-6 space-y-4">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-sm font-medium text-gray-200">{shortcut.action}</p>
                <code className="px-2 py-1 text-xs rounded bg-[#0f0f0f] border border-[#2a2a2a] text-[#00ff88] font-mono whitespace-nowrap">
                  {shortcut.keys}
                </code>
              </div>
              {shortcut.description && (
                <p className="text-xs text-gray-500">{shortcut.description}</p>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#0f0f0f]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Integration
- Add `? key` listener to toggle help modal
- Show in page layout
- Link from Settings → Help tab

### Testing Checklist
- [ ] ? key opens help modal
- [ ] All shortcuts are listed
- [ ] Modal is readable and accessible
- [ ] Close button works
- [ ] Mobile responsive

---

## QUICK WIN #4: Mobile Drawer Improvements

**Effort:** 30 minutes  
**Status:** Ready to implement  
**Impact:** Medium  

### Changes to Make

**File:** `app/components/Sidebar.tsx`

1. **Better overlay contrast:**
   ```typescript
   // Change overlay background
   className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
   // From: bg-black/40 (too transparent)
   // To: bg-black/70 (better visible)
   ```

2. **Swipe-to-close gesture:**
   ```typescript
   const [touchStart, setTouchStart] = useState(0)
   
   onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
   onTouchEnd={(e) => {
     if (touchStart - e.changedTouches[0].clientX > 50) {
       setMenuOpen(false)
     }
   }}
   ```

3. **Better active state indicators:**
   - Increase highlight width from 1px to 2px
   - Add subtle glow effect: `shadow-[0_0_8px_#00ff88]/20`

4. **Larger touch targets:**
   - Increase sidebar item padding from `py-2.5` to `py-3`
   - Icon size already good at 20px

### Testing Checklist
- [ ] Overlay visibly darker
- [ ] Swipe right-to-left closes menu
- [ ] Active item highlighted clearly
- [ ] Touch targets comfortable (44px minimum)
- [ ] No layout shift on open/close
- [ ] Works on all mobile browsers

---

## PHASE 2 PRIORITY ORDER

### Must Do (High Impact)
1. ✅ Enhanced Dashboard quick actions
2. ✅ Global Search (Cmd+K)

### Should Do (Medium Impact)
3. ✅ Keyboard Shortcuts Reference
4. ✅ Mobile Drawer Improvements

### Nice to Have (Lower Priority)
5. Dashboard stats live refresh
6. Export functionality backend
7. Analytics tracking

---

## IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Review all code above
- [ ] Check no conflicts with existing code
- [ ] Plan testing strategy

### Quick Win #1: Dashboard Actions
- [ ] Create QuickActionsBar component
- [ ] Add to Dashboard render
- [ ] Test all buttons
- [ ] Test responsive layout

### Quick Win #2: Global Search
- [ ] Create SearchModal component
- [ ] Add keyboard listener to page
- [ ] Implement search filtering logic
- [ ] Test all keyboard shortcuts
- [ ] Test on mobile

### Quick Win #3: Keyboard Shortcuts
- [ ] Create KeyboardShortcuts component
- [ ] Add ? key listener
- [ ] Integrate into page layout
- [ ] Test help modal

### Quick Win #4: Mobile Improvements
- [ ] Update overlay styles
- [ ] Add touch event listeners
- [ ] Test swipe gesture
- [ ] Verify touch targets

### Final Testing
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All features work on mobile
- [ ] All features work on desktop
- [ ] Keyboard shortcuts work

### Deployment
- [ ] Commit with descriptive message
- [ ] Push to GitHub
- [ ] Verify Dokploy deployment
- [ ] Test live at https://jarvis.kuiler.nl

---

## ESTIMATED TIMELINE

| Task | Effort | Timeline |
|------|--------|----------|
| Dashboard Actions | 1 hour | Hour 1 |
| Global Search | 1.5 hours | Hours 2-3 |
| Keyboard Shortcuts | 0.5 hours | Hour 3-4 |
| Mobile Improvements | 0.5 hours | Hour 4 |
| Testing & Fixes | 1 hour | Hour 5 |
| **Total** | **4.5 hours** | **~1 afternoon** |

---

## SUCCESS METRICS

After Phase 2 deployment, measure:

1. **Dashboard Engagement**
   - % of sessions starting at dashboard (target: 60%+)
   - Average time on dashboard (target: 15+ seconds)

2. **Search Adoption**
   - % of users using Cmd+K (target: 25%+)
   - Average searches per session (target: 1+)

3. **Mobile Responsiveness**
   - No console errors on mobile
   - Drawer opens/closes smoothly
   - Touch targets functional (44px+)
   - Swipe gesture recognized

4. **Feature Completeness**
   - All 7 keyboard shortcuts working
   - All quick actions functional
   - Help modal displaying correctly
   - Overlay properly visible on mobile

---

## NOTES FOR IMPLEMENTATION

1. **API Endpoints** — All search endpoints need to be checked:
   - `/api/chats` — Returns chat list ✅
   - `/api/gpu` — Returns GPU inventory ✅
   - `/api/todos` — Returns todo list ✅
   - `/api/runs` — Returns supervisor runs ✅

2. **Error Handling** — Add try-catch and fallbacks for search queries

3. **Performance** — Debounce search input to avoid excessive API calls

4. **Accessibility** — Ensure:
   - Modals are keyboard navigable
   - Focus is managed properly
   - Screen reader compatible

5. **Mobile Testing** — Test on actual devices if possible:
   - iPhone/iOS
   - Android Chrome
   - iPad/Tablets

---

**Status:** Phase 2 Planning Complete ✅  
**Ready to Start:** YES ✅  
**Estimated Completion:** 1-2 days  
**Next Review:** After Phase 2 deployment
