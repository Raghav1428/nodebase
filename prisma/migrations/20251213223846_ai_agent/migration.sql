/*
  Warnings:

  - The values [OPENAI,ANTHROPIC,GEMINI,OPENROUTER] on the enum `AIProvider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AIProvider_new" AS ENUM ('OPENAI_CHAT_MODEL', 'ANTHROPIC_CHAT_MODEL', 'GEMINI_CHAT_MODEL', 'OPENROUTER_CHAT_MODEL');
ALTER TYPE "AIProvider" RENAME TO "AIProvider_old";
ALTER TYPE "AIProvider_new" RENAME TO "AIProvider";
DROP TYPE "public"."AIProvider_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'OPENAI_CHAT_MODEL';
ALTER TYPE "NodeType" ADD VALUE 'ANTHROPIC_CHAT_MODEL';
ALTER TYPE "NodeType" ADD VALUE 'GEMINI_CHAT_MODEL';
ALTER TYPE "NodeType" ADD VALUE 'OPENROUTER_CHAT_MODEL';
