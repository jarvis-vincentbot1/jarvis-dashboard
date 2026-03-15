import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface GenerateRequest {
  prompt: string
  model?: 'haiku' | 'sonnet' | 'opus'
}

// Map model selection to Anthropic model IDs
const modelMap: Record<string, string> = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-3-5-sonnet-20241022',
  opus: 'claude-3-opus-20250219',
}

export async function POST(request: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const body: GenerateRequest = await request.json()
    const { prompt, model = 'haiku' } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const selectedModel = modelMap[model] || modelMap.haiku

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system:
          'You are Jarvis, an AI supervisor assistant. Provide clear, concise, and actionable responses to user requests. Be professional and helpful.',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Anthropic API error:', errorData)
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate response from Claude' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const result = data.content[0]?.text || 'No response generated'

    return NextResponse.json({
      result,
      model: selectedModel,
      usage: data.usage,
    })
  } catch (error) {
    console.error('AI generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to process request: ${message}` },
      { status: 500 }
    )
  }
}
