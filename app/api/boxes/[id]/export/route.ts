import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const box = await prisma.box.findUnique({
    where: { id: params.id },
    include: { gpus: { orderBy: { createdAt: 'asc' } } },
  })

  if (!box) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const headers = ['Serial Number', 'Model', 'Supplier', 'Cost (USD)', 'Purchase Date', 'Status', 'Notes']
  const rows = box.gpus.map(g => [
    g.serialNumber,
    g.model,
    g.supplier,
    g.cost?.toString() ?? '',
    g.purchaseDate ? new Date(g.purchaseDate).toISOString().split('T')[0] : '',
    g.status,
    g.notes ?? '',
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const filename = `box-${box.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
