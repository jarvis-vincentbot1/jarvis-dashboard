#!/usr/bin/env node
// Applies schema changes to the database using prisma db push
import { execSync } from 'child_process'

console.log('[Migrate] Applying database schema...')
try {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    cwd: '/app',
  })
  console.log('[Migrate] Done.')
} catch (e) {
  console.error('[Migrate] Failed:', e.message)
  process.exit(1)
}
