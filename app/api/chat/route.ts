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

  const { projectId, message, model } = await request.json()

  if (!projectId || !message?.trim()) {
    return NextResponse.json({ error: 'projectId and message are required' }, { status: 400 })
  }

  // Verify project exists
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Save user message
  await prisma.message.create({
    data: { projectId, role: 'user', content: message.trim() },
  })

  // Load full conversation history for this project
  const history = await prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })

  const messages = history.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  // Select model — default to Claude Sonnet
  const selectedModel = model || 'anthropic/claude-sonnet-4-6'

  const systemPrompt = `You are Jarvis, a personal AI assistant for the project "${project.name}"${project.description ? ` — ${project.description}` : ''}. Be concise, direct, and helpful. You have full context of everything discussed in this project.`

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
                data: { projectId, role: 'assistant', content: fullContent },
              })
              await prisma.project.update({
                where: { id: projectId },
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
            data: { projectId, role: 'assistant', content: fullContent },
          })
          await prisma.project.update({
            where: { id: projectId },
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
