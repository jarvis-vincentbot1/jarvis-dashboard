import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

const MAX_SIZE = 20 * 1024 * 1024 // 20MB

async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) return null
  return session
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 413 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Derive extension from original filename or content-type
  const originalName = file.name || 'file'
  const dotIdx = originalName.lastIndexOf('.')
  const ext = dotIdx !== -1 ? originalName.slice(dotIdx + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'
  const storedName = `${randomBytes(14).toString('hex')}.${ext}`

  const uploadDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, storedName), buffer)

  return NextResponse.json({
    url: `/uploads/${storedName}`,
    name: originalName,
    type: file.type,
    size: file.size,
  })
}
