-- AlterEnum
ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_SHEETS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_SHEETS_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_SHEETS';

-- CreateIndex
CREATE INDEX "Workflow_nextRunAt_idx" ON "Workflow"("nextRunAt");
