-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialType" ADD VALUE 'POSTGRES';
ALTER TYPE "CredentialType" ADD VALUE 'MONGODB';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'POSTGRES';
ALTER TYPE "NodeType" ADD VALUE 'MONGODB';
ALTER TYPE "NodeType" ADD VALUE 'MCP_TOOLS';
ALTER TYPE "NodeType" ADD VALUE 'AI_AGENT';
