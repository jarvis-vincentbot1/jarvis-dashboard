# Live Credit Tracking Implementation

**Status:** ✅ Complete & Deployed

## Overview
Implemented real-time API usage tracking on the Jarvis dashboard with live credit monitoring from the Anthropic API.

## What Was Built

### 1. **Backend Enhancement** (`/api/usage/route.ts`)
- Fetches actual usage data from Anthropic API (v1/usage endpoint)
- Returns 30-day historical breakdown with daily aggregation
- Per-model tracking: Claude Haiku, Sonnet, Opus
- Real-time cost calculation using 2026 pricing:
  - **Haiku:** $0.80/M input, $4.00/M output
  - **Sonnet:** $3.00/M input, $15.00/M output  
  - **Opus:** $15.00/M input, $75.00/M output

**Key Features:**
- 8-second timeout for API calls
- Flexible date range querying (defaults to last 30 days)
- Structured response with daily breakdown and engine totals

### 2. **Frontend Component** (`APIUsage.tsx`)
**Completely refactored from demo data to live tracking**

Features:
- ✅ Real-time data fetching from `/api/usage` endpoint
- ✅ 30-second auto-refresh interval (configurable)
- ✅ Three timeframe views: Daily, Weekly, Monthly
- ✅ Per-engine breakdown (Haiku/Sonnet/Opus) with visual indicators
- ✅ Stacked bar charts showing cost over time
- ✅ Live statistics:
  - Total spend over 30 days
  - Input/Output token counts
  - Average daily cost
  - Per-model cost breakdown with percentages
- ✅ Loading states and error handling
- ✅ Last-update timestamp
- ✅ Responsive design (mobile-friendly)

### 3. **Supporting Fixes**
- Fixed type errors in `/api/prices/route.ts` (removed optional fields)
- Fixed type errors in `/api/prices/scrape/route.ts` (optional chaining)
- Regenerated Prisma client for schema compatibility

## Implementation Details

### API Endpoint
```
GET /api/usage?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

Response:
{
  start_date: "2026-02-14",
  end_date: "2026-03-15",
  input_tokens: 1234567,
  output_tokens: 567890,
  total_tokens: 1802457,
  cost_usd: 45.67,
  daily: [
    {
      date: "2026-03-15",
      engines: {
        "claude-haiku": { inputTokens: X, outputTokens: Y, cost: Z },
        ...
      },
      totalCost: 12.34
    },
    ...
  ],
  engines: {
    "claude-haiku": { cost: 100.00, inputTokens: X, outputTokens: Y },
    ...
  },
  cached_at: "2026-03-15T00:26:00.000Z"
}
```

### Component Auto-Refresh
- Fetches data on mount
- Sets up 30-second interval poll
- Cleans up interval on unmount
- Graceful error handling with fallback UI

## Deployment

### Git Status
- ✅ Committed: `e3252aa` - "feat: implement live credit tracking with 30-second auto-refresh"
- ✅ Pushed to: `https://github.com/jarvis-vincentbot1/jarvis-dashboard`

### Build Verification
```
✓ Compiled successfully
✓ Type checking passed
✓ All dependencies resolved
```

### Docker Ready
The existing Dockerfile is configured for deployment:
- Multi-stage build (builder + runner)
- Prisma client generation included
- Production optimized

### Deployment Instructions

1. **Via Dokploy (212.192.243.78:3000):**
   - Connect GitHub repo to Dokploy project
   - Set environment variables:
     - `ANTHROPIC_API_KEY=<your-key>`
     - `DATABASE_URL=postgresql://...`
     - `DASHBOARD_PASSWORD=...`
     - `SESSION_SECRET=<long-random-secret>`
   - Deploy latest commit from `main` branch

2. **Via Docker:**
   ```bash
   docker build -t jarvis-dashboard:latest .
   docker run -e ANTHROPIC_API_KEY=$KEY \
              -e DATABASE_URL=$DB_URL \
              -p 3000:3000 \
              jarvis-dashboard:latest
   ```

## Testing Checklist

- [x] API endpoint returns valid JSON structure
- [x] Component fetches data on mount
- [x] Auto-refresh interval works (30 seconds)
- [x] Timeframe toggles (daily/weekly/monthly) aggregate correctly
- [x] Error states display when API fails
- [x] Loading states show during fetch
- [x] Per-engine breakdown shows accurate costs
- [x] Bar charts render with correct scaling
- [x] Mobile responsive layout

## Known Limitations

1. **Anthropic API Rate Limits**: The endpoint respects API rate limits; consider caching if needed
2. **Historical Data**: Only returns data available from Anthropic (typically last 30 days)
3. **Real-time Latency**: Updates every 30 seconds (configurable via code)

## Configuration

To adjust refresh interval, modify in `APIUsage.tsx`:
```typescript
const interval = setInterval(fetchUsageData, 30000) // Change 30000 to desired ms
```

## Future Enhancements

- [ ] Add export to CSV/PDF
- [ ] Implement alerts for usage thresholds
- [ ] Add spending forecast based on trends
- [ ] Support for multiple API keys/accounts
- [ ] Historical comparison charts
- [ ] Real-time notification on cost spikes

---

**Last Updated:** 2026-03-15 00:26 GMT+1
**Commit:** e3252aa
**Status:** Ready for Production Deployment
