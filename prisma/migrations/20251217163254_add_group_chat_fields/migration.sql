-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "createdById" UUID,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "SessionParticipant" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- CreateIndex
CREATE INDEX "ChatSession_createdById_idx" ON "ChatSession"("createdById");

-- CreateIndex
CREATE INDEX "SessionParticipant_isActive_idx" ON "SessionParticipant"("isActive");

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
