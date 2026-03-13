-- AlterTable: add optional attachments JSON column to Message
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
