import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session.isLoggedIn) return Response.json(null, { status: 401 })

  // Find last message across all chats in this project
  const msg = await prisma.message.findFirst({
    where: { chat: { projectId: params.id } },
    orderBy: { createdAt: 'desc' },
    select: { role: true, content: true, createdAt: true },
  })
  return Response.json(msg)
}
