#!/usr/bin/env node
/**
 * Run database migrations idempotently at container startup.
 */

import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
})

async function migrate() {
  await client.connect()

  // Idempotent schema — safe to run on every startup
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Project" (
      "id"          TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      "description" TEXT,
      "color"       TEXT NOT NULL DEFAULT '#00ff88',
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Message" (
      "id"        TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "role"      TEXT NOT NULL,
      "content"   TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
    );

    -- Add FK only if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Message_projectId_fkey'
          AND table_name = 'Message'
      ) THEN
        ALTER TABLE "Message"
          ADD CONSTRAINT "Message_projectId_fkey"
          FOREIGN KEY ("projectId")
          REFERENCES "Project"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;

    -- Index if not exists
    CREATE INDEX IF NOT EXISTS "Message_projectId_idx" ON "Message"("projectId");

    CREATE TABLE IF NOT EXISTS "Todo" (
      "id"        TEXT NOT NULL,
      "text"      TEXT NOT NULL,
      "done"      BOOLEAN NOT NULL DEFAULT false,
      "projectId" TEXT,
      "dueDate"   TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "Todo_projectId_idx" ON "Todo"("projectId");
    CREATE INDEX IF NOT EXISTS "Todo_done_idx" ON "Todo"("done");
  `)

  console.log('✅ Migrations applied')
  await client.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
