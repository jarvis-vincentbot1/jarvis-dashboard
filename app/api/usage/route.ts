import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// Pricing per million tokens (2026 rates)
const PRICING = {
  'claude-haiku': { input: 0.80, output: 4.00 },      // claude-haiku-4-5
  'claude-sonnet': { input: 3.00, output: 15.00 },    // claude-sonnet-4-6
  'claude-opus': { input: 15.00, output: 75.00 },     // claude-opus-4-1
  'default': { input: 3.00, output: 15.00 },
}

function estimateCost(inputTokens: number, outputTokens: number, model: string = 'default') {
  const p = PRICING[model as keyof typeof PRICING] || PRICING['default']
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
}

function getModelKey(modelName: string): string {
  if (modelName?.includes('haiku')) return 'claude-haiku'
  if (modelName?.includes('sonnet')) return 'claude-sonnet'
  if (modelName?.includes('opus')) return 'claude-opus'
  return 'default'
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  
  const today = new Date()
  const end = endDate || today.toISOString().split('T')[0]
  const start = startDate || (() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 29) // Last 30 days
    return d.toISOString().split('T')[0]
  })()

  try {
    const res = await fetch(
      `https://api.anthropic.com/v1/usage?start_date=${start}&end_date=${end}`,
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) {
      console.error('Anthropic API error:', res.status, res.statusText)
      return NextResponse.json({ error: 'Anthropic API error' }, { status: res.status })
    }

    const data = await res.json()
    
    // Anthropic usage API returns: { data: [ { date: "2026-03-15", model: "claude-opus-4-1", input_tokens: X, output_tokens: Y }, ... ] }
    const usageData: Array<{ date: string; model: string; input_tokens: number; output_tokens: number }> = 
      data.data || data.usage_by_model || []

    // Aggregate by date and model
    const byDateModel: Record<string, Record<string, { input_tokens: number; output_tokens: number }>> = {}
    
    for (const entry of usageData) {
      if (!entry.date || !entry.model) continue
      if (!byDateModel[entry.date]) byDateModel[entry.date] = {}
      
      const modelKey = getModelKey(entry.model)
      if (!byDateModel[entry.date][modelKey]) {
        byDateModel[entry.date][modelKey] = { input_tokens: 0, output_tokens: 0 }
      }
      
      byDateModel[entry.date][modelKey].input_tokens += entry.input_tokens || 0
      byDateModel[entry.date][modelKey].output_tokens += entry.output_tokens || 0
    }

    // Convert to daily breakdown array
    const daily = Object.entries(byDateModel)
      .map(([date, models]) => {
        const engines: Record<string, { inputTokens: number; outputTokens: number; cost: number }> = {}
        let totalCost = 0
        
        for (const [modelKey, tokens] of Object.entries(models)) {
          const cost = estimateCost(tokens.input_tokens, tokens.output_tokens, modelKey)
          engines[modelKey] = {
            inputTokens: tokens.input_tokens,
            outputTokens: tokens.output_tokens,
            cost,
          }
          totalCost += cost
        }
        
        return { date, engines, totalCost }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // Compute totals
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let grandTotal = 0
    const engineTotals: Record<string, { cost: number; inputTokens: number; outputTokens: number }> = {}

    for (const day of daily) {
      for (const [modelKey, usage] of Object.entries(day.engines)) {
        totalInputTokens += usage.inputTokens
        totalOutputTokens += usage.outputTokens
        grandTotal += usage.cost

        if (!engineTotals[modelKey]) {
          engineTotals[modelKey] = { cost: 0, inputTokens: 0, outputTokens: 0 }
        }
        engineTotals[modelKey].cost += usage.cost
        engineTotals[modelKey].inputTokens += usage.inputTokens
        engineTotals[modelKey].outputTokens += usage.outputTokens
      }
    }

    return NextResponse.json({
      start_date: start,
      end_date: end,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      total_tokens: totalInputTokens + totalOutputTokens,
      cost_usd: Math.round(grandTotal * 10000) / 10000,
      daily,
      engines: engineTotals,
      cached_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Usage API error:', err)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
}
