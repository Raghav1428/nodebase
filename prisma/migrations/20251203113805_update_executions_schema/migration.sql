/*
  Warnings:

  - The values [COMPLETED] on the enum `ExecutionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExecutionStatus_new" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
ALTER TABLE "public"."Execution" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Execution" ALTER COLUMN "status" TYPE "ExecutionStatus_new" USING ("status"::text::"ExecutionStatus_new");
ALTER TYPE "ExecutionStatus" RENAME TO "ExecutionStatus_old";
ALTER TYPE "ExecutionStatus_new" RENAME TO "ExecutionStatus";
DROP TYPE "public"."ExecutionStatus_old";
ALTER TABLE "Execution" ALTER COLUMN "status" SET DEFAULT 'RUNNING';
COMMIT;

-- AlterTable
ALTER TABLE "Execution" ALTER COLUMN "output" DROP NOT NULL;
