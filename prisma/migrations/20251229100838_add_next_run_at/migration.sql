-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "nextRunAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Workflow_nextRunAt_idx" ON "Workflow"("nextRunAt");
