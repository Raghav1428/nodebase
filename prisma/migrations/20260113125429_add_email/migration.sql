-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialType" ADD VALUE 'EMAIL_SMTP';
ALTER TYPE "CredentialType" ADD VALUE 'EMAIL_GMAIL';

-- AlterEnum
ALTER TYPE "NodeType" ADD VALUE 'EMAIL';

-- DropIndex
DROP INDEX "public"."Workflow_nextRunAt_idx";
