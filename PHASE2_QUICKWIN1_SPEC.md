# Phase 2: Quick Win #1 - Dashboard Quick Actions

**Status:** Ready for implementation  
**Time Budget:** 60 minutes  
**Priority:** High (1 hour deployment boost)

## Goal
Add 4 quick action buttons to the Jarvis dashboard for common operations, making key features immediately accessible from the dashboard home.

## What to Build

### QuickActionBar Component
A new component with 4 action buttons:

1. **🔍 Search Suppliers** (opens RTX search)
2. **📊 View API Usage** (navigates to API dashboard)
3. **⚙️ Run Job** (opens job creation modal)
4. **🔔 View Alerts** (opens alerts panel)

### Placement
- Add to `app/components/Dashboard.tsx`
- Insert ABOVE existing dashboard content
- Full-width bar with spacing
- Responsive grid: 4 cols @ desktop, 2 cols @ tablet, 1 col @ mobile

### Design Requirements
- Consistent with existing Jarvis UI (see Design Reference below)
- Button styling matches current component library
- Hover/active states
- Dark/light mode compatible
- Accessible (keyboard navigation, ARIA labels)
- Smooth transitions

## File Structure

```
app/
  components/
    QuickActionBar.tsx     ← NEW: Quick action buttons
    Dashboard.tsx          ← MODIFY: Add QuickActionBar at top
  pages/
    dashboard/
      index.tsx            ← No changes needed
```

## Implementation Details

### QuickActionBar.tsx (NEW)
```typescript
// Features:
// - 4 action buttons (icon + label)
// - onClick handlers for navigation
// - Responsive grid layout
// - Dark/light mode compatible
// - Keyboard accessible (Tab, Enter)
// - Hover effects

// Props (optional):
// - onActionClick?: (action: 'search' | 'usage' | 'job' | 'alerts') => void

// Actions trigger:
// 1. 'search' → setSearchOpen(true) OR navigate to RTX search
// 2. 'usage' → navigate to '/dashboard/api-usage'
// 3. 'job' → setJobModalOpen(true) OR trigger job creation
// 4. 'alerts' → setAlertsOpen(true) OR navigate to '/dashboard/alerts'
```

### Dashboard.tsx (MODIFY)
```typescript
// Add near top of component:
<QuickActionBar onActionClick={handleQuickAction} />

// Implement handlers:
const handleQuickAction = (action) => {
  switch(action) {
    case 'search': // Already has search modal
    case 'usage': // Has API usage dashboard
    case 'job': // Has job creation
    case 'alerts': // Has alert panel
  }
}
```

## Design Reference

### Colors
- Background: `bg-white dark:bg-slate-900`
- Button: `bg-slate-100 dark:bg-slate-800`
- Text: `text-slate-900 dark:text-white`
- Hover: `hover:bg-slate-200 dark:hover:bg-slate-700`

### Spacing
- Container padding: `p-6`
- Button gap: `gap-4`
- Button padding: `p-4`

### Typography
- Button label: `text-sm font-medium`
- Icon size: `24px` (lucide-react icons)

### Responsive
- Desktop (1024+): `grid-cols-4`
- Tablet (640-1024): `grid-cols-2`
- Mobile (<640): `grid-cols-1`

## Implementation Steps

1. **Create QuickActionBar.tsx** (15 min)
   - Component structure
   - 4 buttons with icons
   - Styling & responsive grid
   - Event handlers

2. **Integrate into Dashboard.tsx** (10 min)
   - Import QuickActionBar
   - Add to render (top of page)
   - Wire up handlers
   - Test navigation

3. **Style & Polish** (15 min)
   - Dark/light mode verification
   - Hover/focus states
   - Mobile responsiveness
   - Icon sizing

4. **Build & Test** (10 min)
   - `npm run build` (must succeed)
   - No TypeScript errors
   - No console warnings

5. **Deploy** (5 min)
   - Push to VPS
   - Deploy via Dokploy
   - Verify live URL

6. **Verification** (5 min)
   - Test all 4 buttons on desktop
   - Test on mobile (375px)
   - Test dark/light mode
   - Test keyboard navigation

## Icons to Use
```typescript
import {
  Search,      // Search Suppliers
  BarChart3,   // View API Usage
  Zap,         // Run Job
  Bell         // View Alerts
} from 'lucide-react'
```

## Expected Behavior

### Desktop (1024px+)
```
┌──────────────────────────────────────────────────────────┐
│  🔍 Search    📊 Usage    ⚙️ Job    🔔 Alerts            │
└──────────────────────────────────────────────────────────┘
```
(4 buttons in a row)

### Tablet (768px)
```
┌──────────────────────────────┐
│  🔍 Search    📊 Usage       │
│  ⚙️ Job       🔔 Alerts     │
└──────────────────────────────┘
```
(2x2 grid)

### Mobile (375px)
```
┌─────────────────────┐
│  🔍 Search          │
│  📊 Usage           │
│  ⚙️ Job             │
│  🔔 Alerts          │
└─────────────────────┘
```
(1 button per row)

## Verification Checklist

- [ ] Component builds without errors
- [ ] All 4 buttons visible on desktop
- [ ] Buttons are clickable and trigger actions
- [ ] Responsive: works at 375px, 768px, 1024px
- [ ] Dark mode: colors correct
- [ ] Light mode: colors correct
- [ ] Keyboard accessible: Tab navigation works
- [ ] Icons load correctly
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Deployed to production
- [ ] Live at https://jarvis.kuiler.nl

## Testing Commands

```bash
# Build
npm run build

# Type check
npm run typecheck

# Run locally (if setup)
npm run dev
# Visit: http://localhost:3000

# Deploy to production
git add . && git commit -m "feat: Add dashboard quick actions (Phase 2 Quick Win #1)" && git push
# Then deploy via Dokploy UI or CLI
```

## Success Criteria

✅ All 4 buttons present and functional  
✅ Responsive at all breakpoints  
✅ Dark/light mode compatible  
✅ Keyboard accessible  
✅ Deployed to jarvis.kuiler.nl  
✅ Live and tested  

## Timeline

- **Start:** Now
- **Expected Completion:** 60 minutes
- **Go-Live:** Same day (within 1 hour)

## Notes

- Don't overthink design - keep it simple and consistent
- Icons from lucide-react (already available in project)
- Reuse existing color/spacing patterns
- Keep code clean - this is a model for other quick wins
- Document any decisions made

---

**Ready to build. No questions needed.**
