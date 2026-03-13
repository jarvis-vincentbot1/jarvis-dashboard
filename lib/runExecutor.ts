import { prisma } from '@/lib/prisma'

const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://100.116.130.111:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''

async function callLLM(prompt: string, model: string): Promise<string> {
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
      messages: [{ role: 'user', content: prompt }],
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ headersTimeout: 120000, bodyTimeout: 120000 } as any),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenClaw API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function executeRun(runId: string): Promise<void> {
  await prisma.run.update({ where: { id: runId }, data: { status: 'running' } })

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })

  if (!run) return

  for (const step of run.steps) {
    // Skip completed/approved steps and skipped steps
    if (step.status === 'skipped') continue
    if (step.status === 'done' && (!step.requiresReview || step.approved)) continue

    // Step is done but waiting for review — stay paused
    if (step.status === 'done' && step.requiresReview && !step.approved) {
      await prisma.run.update({ where: { id: runId }, data: { status: 'paused' } })
      return
    }

    // Step errored previously — abort run
    if (step.status === 'error') {
      await prisma.run.update({ where: { id: runId }, data: { status: 'error' } })
      return
    }

    // Execute with retries
    let success = false
    for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
      try {
        await prisma.runStep.update({
          where: { id: step.id },
          data: { status: 'running', retries: attempt },
        })

        const model = step.model || run.model
        const result = await callLLM(step.prompt, model)

        await prisma.runStep.update({
          where: { id: step.id },
          data: { status: 'done', result },
        })
        success = true
        break
      } catch (error) {
        console.error(`Run ${runId} step ${step.id} attempt ${attempt} failed:`, error)
      }
    }

    if (!success) {
      await prisma.runStep.update({
        where: { id: step.id },
        data: { status: 'error', retries: step.maxRetries },
      })
      await prisma.run.update({ where: { id: runId }, data: { status: 'error' } })
      return
    }

    // Step succeeded — pause if review required
    if (step.requiresReview) {
      await prisma.run.update({ where: { id: runId }, data: { status: 'paused' } })
      return
    }
  }

  await prisma.run.update({ where: { id: runId }, data: { status: 'done' } })
}
