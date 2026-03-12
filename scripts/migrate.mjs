#!/usr/bin/env node
/**
 * Run database migrations using raw SQL.
 * Called at container startup before the app starts.
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
})

async function migrate() {
  await client.connect()

  const sql = readFileSync(
    join(__dirname, '../prisma/migrations/20240101_init/migration.sql'),
    'utf8'
  )

  await client.query(sql)
  console.log('✅ Migrations applied')
  await client.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
