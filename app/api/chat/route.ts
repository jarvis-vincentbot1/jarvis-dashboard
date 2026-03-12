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

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chatId, message, model } = await request.json()

  if (!chatId || !message?.trim()) {
    return NextResponse.json({ error: 'chatId and message are required' }, { status: 400 })
  }

  const trimmed = message.trim()

  // --- Todo command shortcuts (handled before AI) ---
  const addMatch = trimmed.match(/^(?:add (?:to-?do|reminder|task)|reminder):\s*(.+)/i)
  if (addMatch) {
    const text = addMatch[1].trim()
    await prisma.todo.create({ data: { text } })
    const quickReply = `Added: ${text} ✅`
    return Response.json({ quickReply })
  }

  if (/^(?:list to-?dos?|what are my to-?dos?|show to-?dos?)\??$/i.test(trimmed)) {
    const todos = await prisma.todo.findMany({
      where: { done: false },
      orderBy: { createdAt: 'desc' },
    })
    const quickReply = todos.length === 0
      ? 'No open to-dos.'
      : `**Open to-dos:**\n${todos.map((t, i) => `${i + 1}. ${t.text}`).join('\n')}`
    return Response.json({ quickReply })
  }

  const doneMatch = trimmed.match(/^(?:done|complete|mark done|finish):\s*(.+)/i)
  if (doneMatch) {
    const search = doneMatch[1].trim().toLowerCase()
    const todos = await prisma.todo.findMany({ where: { done: false } })
    const match = todos.find((t) => t.text.toLowerCase().includes(search))
    if (match) {
      await prisma.todo.update({ where: { id: match.id }, data: { done: true } })
      return Response.json({ quickReply: `Done: ${match.text} ✅` })
    }
    return Response.json({ quickReply: `No matching to-do found for "${doneMatch[1]}"` })
  }
  // --- End todo shortcuts ---

  // Verify chat exists
  const chat = await prisma.chat.findUnique({ where: { id: chatId } })
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
  }

  // Save user message
  await prisma.message.create({
    data: { chatId, role: 'user', content: message.trim() },
  })

  // Load last 20 messages from this chat
  const history = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const messages = history.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  // Select model — default to Claude Sonnet
  const selectedModel = model || 'anthropic/claude-sonnet-4-6'

  const systemPrompt = `You are Jarvis, a personal AI assistant. Be concise, direct, and helpful.`

  // Stream via OpenClaw's OpenAI-compatible endpoint
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ''

      try {
        const response = await fetch(`${OPENCLAW_API_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
            'Content-Type': 'application/json',
            'x-openclaw-agent-id': 'main',
          },
          body: JSON.stringify({
            model: selectedModel,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages,
            ],
          }),
        })

        if (!response.ok) {
          const err = await response.text()
          throw new Error(`OpenClaw API error ${response.status}: ${err}`)
        }

        const reader = response.body!.getReader()
        const dec = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              // Save full assistant response
              await prisma.message.create({
                data: { chatId, role: 'assistant', content: fullContent },
              })
              await prisma.chat.update({
                where: { id: chatId },
                data: { updatedAt: new Date() },
              })
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              return
            }
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`)
                )
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        // If stream ended without [DONE]
        if (fullContent) {
          await prisma.message.create({
            data: { chatId, role: 'assistant', content: fullContent },
          })
          await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
          })
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        console.error('OpenClaw stream error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'AI error: ' + String(error) })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
