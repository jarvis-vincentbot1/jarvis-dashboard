import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, message } = await request.json()

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
    data: {
      projectId,
      role: 'user',
      content: message.trim(),
    },
  })

  // Load full conversation history for this project only
  const history = await prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  })

  // Build messages for Claude — only this project's history
  const claudeMessages = history.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  // Stream response from Claude
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ''

      try {
        const claudeStream = await anthropic.messages.stream({
          model: 'claude-opus-4-5',
          max_tokens: 4096,
          system: `You are Jarvis, a personal AI assistant for the project "${project.name}"${project.description ? ` — ${project.description}` : ''}. Be concise, direct, and helpful. You have context of everything discussed in this project.`,
          messages: claudeMessages,
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullContent += chunk.delta.text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        // Save assistant message to DB
        await prisma.message.create({
          data: {
            projectId,
            role: 'assistant',
            content: fullContent,
          },
        })

        // Update project updatedAt
        await prisma.project.update({
          where: { id: projectId },
          data: { updatedAt: new Date() },
        })

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        console.error('Claude stream error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'AI error' })}\n\n`)
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
