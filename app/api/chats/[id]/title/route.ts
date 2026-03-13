import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://100.116.130.111:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the first user message in this chat
  const firstUserMessage = await prisma.message.findFirst({
    where: { chatId: params.id, role: 'user' },
    orderBy: { createdAt: 'asc' },
  })

  if (!firstUserMessage) {
    return NextResponse.json({ error: 'No messages found' }, { status: 404 })
  }

  // Trim long messages for the prompt
  const snippet = firstUserMessage.content.slice(0, 500)

  try {
    const response = await fetch(`${OPENCLAW_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-6',
        messages: [
          {
            role: 'system',
            content:
              'Generate a concise, descriptive chat title in 3-6 words based on the user message. ' +
              'Return ONLY the title — no quotes, no punctuation at the end, no explanation.',
          },
          {
            role: 'user',
            content: snippet,
          },
        ],
        max_tokens: 20,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const rawTitle: string =
      data?.choices?.[0]?.message?.content?.trim() ?? ''

    // Fallback: first 6 words of the user message
    const title =
      rawTitle.length > 2
        ? rawTitle.replace(/^["']|["']$/g, '').slice(0, 60)
        : firstUserMessage.content
            .split(/\s+/)
            .slice(0, 6)
            .join(' ')
            .slice(0, 60)

    const updated = await prisma.chat.update({
      where: { id: params.id },
      data: { name: title },
    })

    return NextResponse.json({ name: updated.name })
  } catch (err) {
    console.error('Title generation error:', err)

    // Graceful fallback: use the first 6 words of the user message
    const fallback = firstUserMessage.content
      .split(/\s+/)
      .slice(0, 6)
      .join(' ')
      .slice(0, 60)

    const updated = await prisma.chat.update({
      where: { id: params.id },
      data: { name: fallback },
    })

    return NextResponse.json({ name: updated.name })
  }
}
