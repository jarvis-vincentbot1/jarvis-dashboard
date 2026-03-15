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
    // NOTE: Anthropic's /v1/usage endpoint is not publicly available.
    // This is a known limitation of the Anthropic API.
    // Return error signal for UI to show fallback message
    
    console.warn('Anthropic /v1/usage endpoint is not available (API limitation)')
    
    // Return special error response that frontend will catch
    return NextResponse.json({
      error: 'anthropic_endpoint_unavailable',
      message: 'Anthropic does not expose /v1/usage endpoint. Check https://console.anthropic.com for billing data.',
      start_date: start,
      end_date: end,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      daily: [],
      engines: {},
      cached_at: new Date().toISOString(),
    }, { status: 200 }) // Status 200 so frontend can handle gracefully
  } catch (err) {
    console.error('Usage API error:', err)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
}
