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

    CREATE TABLE IF NOT EXISTS "Chat" (
      "id"        TEXT NOT NULL,
      "name"      TEXT NOT NULL DEFAULT 'New chat',
      "projectId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
    );

    -- Add projectId FK on Chat if not exists
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Chat_projectId_fkey'
          AND table_name = 'Chat'
      ) THEN
        ALTER TABLE "Chat"
          ADD CONSTRAINT "Chat_projectId_fkey"
          FOREIGN KEY ("projectId")
          REFERENCES "Project"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "Chat_projectId_idx" ON "Chat"("projectId");

    CREATE TABLE IF NOT EXISTS "Message" (
      "id"        TEXT NOT NULL,
      "role"      TEXT NOT NULL,
      "content"   TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
    );

    -- Add projectId column to Message if it doesn't exist (legacy, keep for data migration)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Message' AND column_name = 'projectId'
      ) THEN
        ALTER TABLE "Message" ADD COLUMN "projectId" TEXT;
      END IF;
    END $$;

    -- Add chatId column to Message if not exists
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Message' AND column_name = 'chatId'
      ) THEN
        ALTER TABLE "Message" ADD COLUMN "chatId" TEXT;

        -- Migrate existing messages: create one Chat per project that has messages
        INSERT INTO "Chat" ("id", "name", "projectId", "createdAt", "updatedAt")
        SELECT
          'migrated_' || p."id",
          p."name",
          p."id",
          COALESCE(MIN(m."createdAt"), NOW()),
          COALESCE(MAX(m."createdAt"), NOW())
        FROM "Project" p
        JOIN "Message" m ON m."projectId" = p."id"
        GROUP BY p."id", p."name"
        ON CONFLICT ("id") DO NOTHING;

        -- Link existing messages to their migrated chat
        UPDATE "Message" m
        SET "chatId" = 'migrated_' || m."projectId"
        WHERE m."chatId" IS NULL AND m."projectId" IS NOT NULL;
      END IF;
    END $$;

    -- Add chatId FK if not exists
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Message_chatId_fkey'
          AND table_name = 'Message'
      ) THEN
        ALTER TABLE "Message"
          ADD CONSTRAINT "Message_chatId_fkey"
          FOREIGN KEY ("chatId")
          REFERENCES "Chat"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "Message_chatId_idx" ON "Message"("chatId");

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
