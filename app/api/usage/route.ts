import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

// Pricing per million tokens (approximate 2026 rates)
const PRICING = {
  haiku: { input: 0.80, output: 4.00 },    // claude-haiku-4-5
  sonnet: { input: 3.00, output: 15.00 },  // claude-sonnet-4-6
  default: { input: 3.00, output: 15.00 }, // fallback
}

function estimateCost(inputTokens: number, outputTokens: number, modelKey: keyof typeof PRICING = 'default') {
  const p = PRICING[modelKey]
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  try {
    const res = await fetch(
      `https://api.anthropic.com/v1/usage?start_date=${today}&end_date=${today}`,
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (res.ok) {
      const data = await res.json()

      // Try to parse per-model breakdown if available
      const inputTokens: number = data.input_tokens ?? data.usage?.input_tokens ?? 0
      const outputTokens: number = data.output_tokens ?? data.usage?.output_tokens ?? 0

      // Check for per-model breakdown in the response
      const models: Array<{ model: string; input_tokens: number; output_tokens: number }> =
        data.data ?? data.models ?? []

      let totalCostUsd = 0
      const modelBreakdown: Array<{ model: string; inputTokens: number; outputTokens: number; costUsd: number }> = []

      if (models.length > 0) {
        for (const m of models) {
          const key = m.model?.includes('haiku') ? 'haiku'
            : m.model?.includes('sonnet') ? 'sonnet'
            : 'default'
          const cost = estimateCost(m.input_tokens ?? 0, m.output_tokens ?? 0, key)
          totalCostUsd += cost
          modelBreakdown.push({
            model: m.model,
            inputTokens: m.input_tokens ?? 0,
            outputTokens: m.output_tokens ?? 0,
            costUsd: cost,
          })
        }
      } else if (inputTokens > 0 || outputTokens > 0) {
        totalCostUsd = estimateCost(inputTokens, outputTokens, 'sonnet')
      }

      return NextResponse.json({
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: Math.round(totalCostUsd * 10000) / 10000,
        models: modelBreakdown,
        date: today,
      })
    }
  } catch {
    // Fall through
  }

  return NextResponse.json({ error: 'unavailable' })
}
