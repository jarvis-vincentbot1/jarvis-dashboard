import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://100.116.130.111:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''

// Available models exposed to the UI (not exported from route — fetched via GET)
const AVAILABLE_MODELS = [
  {
    id: 'anthropic/claude-sonnet-4-6',
    label: 'Claude Sonnet',
    provider: 'Anthropic',
    description: 'Fast, smart, great for most tasks',
  },
  {
    id: 'ollama/minimax-m2.5:cloud',
    label: 'MiniMax M2.5',
    provider: 'Ollama (local)',
    description: 'Local model, free & private',
  },
]

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function GET() {
  return NextResponse.json({ models: AVAILABLE_MODELS })
}

// Runs in the background after POST returns — no streaming, saves full response to DB
async function generateResponse(
  assistantMessageId: string,
  chatId: string,
  aiMessages: Array<{ role: string; content: unknown }>,
  model: string,
) {
  try {
    const response = await fetch(`${OPENCLAW_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': 'main',
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: aiMessages,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...({ headersTimeout: 120000, bodyTimeout: 120000 } as any),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenClaw API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    await prisma.message.update({
      where: { id: assistantMessageId },
      data: { content, status: 'done' },
    })
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    })
  } catch (error) {
    console.error('Background generation error:', error)
    await prisma.message.update({
      where: { id: assistantMessageId },
      data: {
        content: '⚠️ Failed to get response. Please try again.',
        status: 'error',
      },
    }).catch(() => {})
  }
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chatId, message, model, attachments } = await request.json()

  if (!chatId || !message?.trim()) {
    return NextResponse.json({ error: 'chatId and message are required' }, { status: 400 })
  }

  const trimmed = message.trim()

  // --- Todo command shortcuts (synchronous quick replies, no DB messages) ---
  const addMatch = trimmed.match(/^(?:add (?:to-?do|reminder|task)|reminder):\s*(.+)/i)
  if (addMatch) {
    const text = addMatch[1].trim()
    await prisma.todo.create({ data: { text } })
    return NextResponse.json({ quickReply: `Added: ${text} ✅` })
  }

  if (/^(?:list to-?dos?|what are my to-?dos?|show to-?dos?)\??$/i.test(trimmed)) {
    const todos = await prisma.todo.findMany({
      where: { done: false },
      orderBy: { createdAt: 'desc' },
    })
    const quickReply = todos.length === 0
      ? 'No open to-dos.'
      : `**Open to-dos:**\n${todos.map((t, i) => `${i + 1}. ${t.text}`).join('\n')}`
    return NextResponse.json({ quickReply })
  }

  const doneMatch = trimmed.match(/^(?:done|complete|mark done|finish):\s*(.+)/i)
  if (doneMatch) {
    const search = doneMatch[1].trim().toLowerCase()
    const todos = await prisma.todo.findMany({ where: { done: false } })
    const match = todos.find((t) => t.text.toLowerCase().includes(search))
    if (match) {
      await prisma.todo.update({ where: { id: match.id }, data: { done: true } })
      return NextResponse.json({ quickReply: `Done: ${match.text} ✅` })
    }
    return NextResponse.json({ quickReply: `No matching to-do found for "${doneMatch[1]}"` })
  }
  // --- End todo shortcuts ---

  // Verify chat exists
  const chat = await prisma.chat.findUnique({ where: { id: chatId } })
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  // Save user message
  const userMessage = await prisma.message.create({
    data: {
      chatId,
      role: 'user',
      content: message.trim(),
      ...(attachments?.length ? { attachments } : {}),
    },
  })

  // Create empty placeholder for the assistant response
  const assistantMessage = await prisma.message.create({
    data: {
      chatId,
      role: 'assistant',
      content: '',
      status: 'generating',
    },
  })

  // Load history for AI context (exclude the generating placeholder)
  const history = await prisma.message.findMany({
    where: { chatId, id: { not: assistantMessage.id } },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const selectedModel = model || 'anthropic/claude-sonnet-4-6'
  const systemPrompt = `You are Jarvis, a personal AI assistant. Be concise, direct, and helpful.`

  // Build messages array for AI
  interface AttachmentMeta { name: string; type: string; size: number; url: string }
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }

  const baseMessages = history.slice(0, -1).map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  // Build the last user message with optional image/file attachments
  const lastMsgContent: ContentPart[] = []
  if (attachments?.length) {
    const imageAttachments = (attachments as AttachmentMeta[]).filter(a => a.type.startsWith('image/'))
    const nonImages = (attachments as AttachmentMeta[]).filter(a => !a.type.startsWith('image/'))

    for (const img of imageAttachments) {
      const imageUrl = img.url.startsWith('/') ? `https://jarvis.kuiler.nl${img.url}` : img.url
      lastMsgContent.push({ type: 'image_url', image_url: { url: imageUrl } })
    }

    const textParts: string[] = []
    if (message?.trim()) textParts.push(message.trim())
    if (nonImages.length) {
      textParts.push('[Files: ' + nonImages.map(a => `${a.name} (${a.type}, ${Math.round(a.size / 1024)}KB)`).join(', ') + ']')
    }
    lastMsgContent.push({ type: 'text', text: textParts.join('\n\n') || '(see images above)' })
  }

  const lastUserMessage = lastMsgContent.length > 0
    ? { role: 'user' as const, content: lastMsgContent }
    : { role: 'user' as const, content: message.trim() }

  const aiMessages = [
    { role: 'system', content: systemPrompt },
    ...baseMessages,
    lastUserMessage,
  ]

  // Fire and forget — response persists even if client disconnects
  void generateResponse(assistantMessage.id, chatId, aiMessages, selectedModel)

  return NextResponse.json({
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
    status: 'generating',
  })
}
